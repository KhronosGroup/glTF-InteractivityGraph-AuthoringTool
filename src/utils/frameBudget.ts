// Frame-budgeted async scheduler used by the graph-loading pipeline. Large graphs used to load in
// one synchronous pass that blocked the main thread for seconds; runChunked spreads that work across
// animation frames so the UI (and the loading progress bar) stay responsive. Each item is processed
// synchronously, but once a per-frame time budget is exceeded we yield to the browser for one frame
// before continuing.

export interface RunChunkedOptions {
    // Max time (ms) to spend working before yielding a frame. The yield costs a whole rAF turn
    // (~8ms of waiting for the next vsync on top of the browser's own frame work), so the budget
    // sets the duty cycle: at 8ms roughly half the wall-clock time of a long load was spent idle.
    // 24ms keeps input latency within a couple of frames while spending ~75% of the time working.
    budgetMs?: number;
    // Called after each yield (and once at the end) with progress in [0, 1].
    onProgress?: (progress: number) => void;
    // Cooperative cancellation: a second load supersedes an in-flight one. When it flips to true the
    // run stops quietly at the next item boundary and the returned promise rejects with AbortError.
    cancelled?: { current: boolean };
}

const nextFrame = (): Promise<void> =>
    new Promise((resolve) => requestAnimationFrame(() => resolve()));

class AbortError extends Error {
    constructor() {
        super("runChunked cancelled");
        this.name = "AbortError";
    }
}

export const isAbortError = (e: unknown): boolean =>
    e instanceof Error && e.name === "AbortError";

/**
 * Process `items` one at a time via `worker`, yielding to the browser whenever the per-frame time
 * budget is exceeded. Resolves once every item is processed; rejects with an AbortError if cancelled.
 */
export const runChunked = async <T>(
    items: readonly T[],
    worker: (item: T, index: number) => void,
    options: RunChunkedOptions = {},
): Promise<void> => {
    const { budgetMs = 24, onProgress, cancelled } = options;
    const total = items.length;
    if (total === 0) {
        onProgress?.(1);
        return;
    }

    let frameStart = performance.now();
    for (let i = 0; i < total; i++) {
        if (cancelled?.current) { throw new AbortError(); }
        worker(items[i], i);

        if (performance.now() - frameStart >= budgetMs) {
            onProgress?.((i + 1) / total);
            await nextFrame();
            if (cancelled?.current) { throw new AbortError(); }
            frameStart = performance.now();
        }
    }
    onProgress?.(1);
};
