import { useEffect, useState } from "react";

/**
 * The window's current devicePixelRatio, re-read whenever it changes.
 *
 * Both canvases in the app (the Babylon viewport and the graph minimap) size their backing store in
 * device pixels, so they have to repaint when the ratio changes — otherwise they stay at the ratio
 * they were created with and render blurry (or needlessly large). A `resize` listener is not enough:
 * dragging the window to a second monitor with a different scale factor changes devicePixelRatio
 * without necessarily resizing the window, and a matchMedia query is the only reliable signal.
 *
 * The query has to be pinned to a specific ratio, so it is re-armed at the new ratio after each
 * change.
 */
export const useDevicePixelRatio = (): number => {
    const [devicePixelRatio, setDevicePixelRatio] = useState(() => getDevicePixelRatio());

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") { return; }

        let query: MediaQueryList | null = null;
        let cancelled = false;

        const subscribe = () => {
            query?.removeEventListener("change", onChange);
            query = window.matchMedia(`(resolution: ${getDevicePixelRatio()}dppx)`);
            query.addEventListener("change", onChange);
        };

        const onChange = () => {
            if (cancelled) { return; }
            setDevicePixelRatio(getDevicePixelRatio());
            subscribe();
        };

        subscribe();
        return () => {
            cancelled = true;
            query?.removeEventListener("change", onChange);
        };
    }, []);

    return devicePixelRatio;
};

const getDevicePixelRatio = (): number =>
    (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
