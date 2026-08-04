import { RefObject, useCallback, useEffect, useState } from "react";

interface WebkitFullscreenDocument extends Document {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
}

interface WebkitFullscreenElement extends HTMLElement {
    webkitRequestFullscreen?: () => Promise<void> | void;
}

export function getFullscreenElement(): Element | null {
    return document.fullscreenElement ?? (document as WebkitFullscreenDocument).webkitFullscreenElement ?? null;
}

async function exitFullscreen(): Promise<void> {
    if (document.exitFullscreen) {
        await document.exitFullscreen();
    } else {
        await (document as WebkitFullscreenDocument).webkitExitFullscreen?.();
    }
}

/**
 * Expands one element to fullscreen.
 *
 * Two paths, because the Fullscreen API is not always available (older WebKit, and any browser that
 * blocks it by permissions policy — an app embedded in an iframe usually is): the native one, and a
 * CSS fallback where the caller puts `fallback` on the element to make it cover the viewport. The
 * fallback has no browser-provided way out, so Escape is wired up here.
 */
export const useFullscreen = (ref: RefObject<HTMLElement | null>) => {
    const [native, setNative] = useState(false);
    const [fallback, setFallback] = useState(false);

    useEffect(() => {
        const update = () => setNative(getFullscreenElement() === ref.current);
        document.addEventListener("fullscreenchange", update);
        document.addEventListener("webkitfullscreenchange", update);
        return () => {
            document.removeEventListener("fullscreenchange", update);
            document.removeEventListener("webkitfullscreenchange", update);
        };
    }, [ref]);

    useEffect(() => {
        if (!fallback) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setFallback(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [fallback]);

    const toggle = useCallback(async () => {
        const element = ref.current;
        if (!element) return;
        if (fallback) {
            setFallback(false);
            return;
        }
        if (getFullscreenElement() === element) {
            await exitFullscreen();
            return;
        }
        try {
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if ((element as WebkitFullscreenElement).webkitRequestFullscreen) {
                await (element as WebkitFullscreenElement).webkitRequestFullscreen!();
            } else {
                setFallback(true);
            }
        } catch {
            setFallback(true);
        }
    }, [ref, fallback]);

    return { isFullscreen: native || fallback, fallback, toggle };
};
