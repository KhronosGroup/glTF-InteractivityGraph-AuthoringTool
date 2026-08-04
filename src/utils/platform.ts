// Platform detection for the keyboard-shortcut labels in the input legend. The shortcut *handlers*
// are platform-agnostic (they accept ctrlKey or metaKey), so a wrong answer here only mislabels the
// legend — but a mislabeled legend is exactly what a first-time Mac user reads.

// Every signal is unreliable on its own: navigator.userAgentData exists only on Chromium and only in
// secure contexts, and can report an empty platform when UA-hint entropy is reduced; navigator.platform
// is deprecated and spoofed by privacy browsers; the UA string is spoofed in the other direction. So
// test the union of whatever is present rather than short-circuiting on the first non-empty one — any
// Mac-ish signal wins.
const platformSignals = (): string => {
    if (typeof navigator === "undefined") { return ""; }
    const uaData = (navigator as any).userAgentData;
    return [uaData?.platform, navigator.platform, navigator.userAgent]
        .filter(Boolean)
        .join(" ");
};

// "MacIntel" (Safari/Firefox), "macOS" (Chromium UA hints), "Macintosh" (UA string). iPhone/iPad/iPod
// are included because iPadOS with a hardware keyboard uses the same ⌘ shortcuts — and iPadOS reports
// itself as "MacIntel" anyway.
const MAC_PLATFORM = /\b(Mac|macOS|MacIntel|Macintosh|iPhone|iPad|iPod)/i;

// Lazily resolved and then cached: at module-evaluation time the document may not be in its final
// context (embedded iframe, prerender), and caching keeps the legend from flipping between renders.
let cachedIsMac: boolean | undefined;

export const isMacPlatform = (): boolean => {
    if (cachedIsMac === undefined) {
        cachedIsMac = MAC_PLATFORM.test(platformSignals());
    }
    return cachedIsMac;
};

// Legend labels for the copy/paste/duplicate/delete shortcuts. Mac uses the glyphs its users already
// read on native menus (⌘, ⌫) rather than spelling out "Cmd".
export interface ShortcutLabels {
    copyPaste: string;
    duplicate: string;
    del: string;
}

export const getShortcutLabels = (): ShortcutLabels => isMacPlatform()
    ? { copyPaste: "⌘C / ⌘V", duplicate: "⌘D", del: "⌫" }
    : { copyPaste: "Ctrl+C / Ctrl+V", duplicate: "Ctrl+D", del: "Del" };
