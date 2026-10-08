import fs from "fs";
import path from "path";

export interface BenchResult {
    name: string;
    unit: string;
    unitsPerTick: number;
    ticksPerSample: number;
    medianMsPerTick: number;
    minMsPerTick: number;
    nsPerUnit: number;
}

export interface BenchCase {
    tick: () => void;
    unit: string;
    unitsPerTick: number;
}

const SAMPLES = Number(process.env.PERF_SAMPLES ?? 9);
const TARGET_SAMPLE_MS = Number(process.env.PERF_SAMPLE_MS ?? 40);
const WARMUP_MS = 150;

const now = () => performance.now();

/** Runs `tick` for warmup, calibrates ticks per sample, then reports per-tick median/min over the samples. */
export const runBench = (name: string, c: BenchCase): BenchResult => {
    const warmupEnd = now() + WARMUP_MS;
    let calibrationTicks = 0;
    while (now() < warmupEnd) {
        c.tick();
        calibrationTicks++;
    }
    const ticksPerSample = Math.max(1, Math.round(calibrationTicks * TARGET_SAMPLE_MS / WARMUP_MS));

    const samples: number[] = [];
    for (let s = 0; s < SAMPLES; s++) {
        const start = now();
        for (let i = 0; i < ticksPerSample; i++) {
            c.tick();
        }
        samples.push((now() - start) / ticksPerSample);
    }
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    return {
        name,
        unit: c.unit,
        unitsPerTick: c.unitsPerTick,
        ticksPerSample,
        medianMsPerTick: median,
        minMsPerTick: samples[0],
        nsPerUnit: median * 1e6 / c.unitsPerTick,
    };
};

/** One-shot timing for things that cannot be repeated cheaply in a tight loop (e.g. graph load). */
export const runOnce = (name: string, unit: string, units: number, fn: () => void, repeats = 5): BenchResult => {
    fn();
    const samples: number[] = [];
    for (let i = 0; i < repeats; i++) {
        const start = now();
        fn();
        samples.push(now() - start);
    }
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    return {name, unit, unitsPerTick: units, ticksPerSample: 1, medianMsPerTick: median, minMsPerTick: samples[0], nsPerUnit: median * 1e6 / units};
};

const RESULTS_DIR = path.resolve("tst/perf/results");

const fmt = (n: number, digits = 3) => n.toFixed(digits).padStart(10);

/** Prints a table, writes results/latest.json and compares against results/baseline.json when present. */
export const reportResults = (results: BenchResult[]) => {
    fs.mkdirSync(RESULTS_DIR, {recursive: true});
    const baselinePath = path.join(RESULTS_DIR, "baseline.json");
    const baseline: Record<string, BenchResult> = {};
    if (fs.existsSync(baselinePath)) {
        for (const r of JSON.parse(fs.readFileSync(baselinePath, "utf8")) as BenchResult[]) {
            baseline[r.name] = r;
        }
    }

    const lines = [
        "",
        `${"benchmark".padEnd(44)}${"ms/tick".padStart(10)}${"min".padStart(10)}${"ns/unit".padStart(10)}  unit${Object.keys(baseline).length ? "            vs baseline" : ""}`,
    ];
    for (const r of results) {
        const base = baseline[r.name];
        const delta = base ? `  ${(base.medianMsPerTick / r.medianMsPerTick).toFixed(2)}x` : "";
        lines.push(`${r.name.padEnd(44)}${fmt(r.medianMsPerTick)}${fmt(r.minMsPerTick)}${fmt(r.nsPerUnit, 0)}  ${(r.unit + ` x${r.unitsPerTick}`).padEnd(16)}${delta}`);
    }
    process.stdout.write(lines.join("\n") + "\n\n");

    fs.writeFileSync(path.join(RESULTS_DIR, "latest.json"), JSON.stringify(results, null, 2));
    if (process.env.PERF_SAVE_BASELINE) {
        fs.writeFileSync(baselinePath, JSON.stringify(results, null, 2));
    }
};
