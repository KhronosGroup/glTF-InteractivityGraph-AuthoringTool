import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useStoreApi } from "reactflow";
import { InteractivityGraphContext } from "../InteractivityGraphContext";

// The LOD box's dotted warning border (see flow-node--warning in flowNodes.css) is 5px in
// graph-space, so it scales down with zoom like everything else in the pane. Below this zoom it
// renders under a screen pixel or two and stops reading as "dotted" at all. Below it, warnings
// are instead called out with a fixed-screen-size badge over the node, positioned outside
// reactflow's zoom-transformed pane so it stays legible regardless of how far zoomed out.
export const WARNING_ANNOTATION_ZOOM_THRESHOLD = 0.15;

// Distance from the badge's bottom-right edge to its tail tip, which sits at (30.5, 30.5) in the
// 32x32 svg below. Shifting the badge by this much past the node's top-left corner lands the tip
// exactly on that corner.
const BADGE_CORNER_OFFSET = 1.5;

/**
 * Fixed-size warning-triangle badges over nodes that have a warning, shown once the LOD box's
 * dotted border is too small on screen to read. Badge elements are only created/destroyed when
 * the set of warning node uids changes (via React); their screen position is then updated
 * imperatively from the reactflow store on every pan/zoom frame, so panning never re-renders.
 */
export const NodeWarningAnnotations = () => {
    const store = useStoreApi();
    const { nodeWarnings, diagnosticsByNodeUid } = useContext(InteractivityGraphContext);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const badgeRefs = useRef(new Map<string, HTMLDivElement>());
    const frameRef = useRef<number | null>(null);

    const warningUids = useMemo(() => {
        const uids = new Set<string>();
        Object.keys(nodeWarnings).forEach((uid) => { if (nodeWarnings[uid]?.length > 0) { uids.add(uid); } });
        diagnosticsByNodeUid.forEach((diagnostics, uid) => { if (diagnostics.length > 0) { uids.add(uid); } });
        return Array.from(uids);
    }, [nodeWarnings, diagnosticsByNodeUid]);

    const draw = useCallback(() => {
        const container = containerRef.current;
        if (!container) { return; }
        const state = store.getState();
        const [tx, ty, zoom] = state.transform;

        if (zoom >= WARNING_ANNOTATION_ZOOM_THRESHOLD) {
            container.style.display = "none";
            return;
        }
        container.style.display = "";

        badgeRefs.current.forEach((el, uid) => {
            const node = state.nodeInternals.get(uid);
            if (!node) {
                el.style.display = "none";
                return;
            }
            el.style.display = "";
            const { x, y } = node.positionAbsolute ?? node.position;
            const cx = x * zoom + tx;
            const cy = y * zoom + ty;
            // the tail (bottom-right of the badge) lands on the node's top-left corner
            el.style.transform = `translate(${cx}px, ${cy}px) translate(calc(-100% + ${BADGE_CORNER_OFFSET}px), calc(-100% + ${BADGE_CORNER_OFFSET}px))`;
        });
    }, [store]);

    const scheduleDraw = useCallback(() => {
        if (frameRef.current !== null) { return; }
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            draw();
        });
    }, [draw]);

    useEffect(() => {
        scheduleDraw();
        // subscribe to the whole store rather than useStore-with-selector: pan/zoom repositions
        // badges directly via refs, no React re-render per frame
        const unsubscribe = store.subscribe(scheduleDraw);
        return () => {
            unsubscribe();
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, [store, scheduleDraw]);

    // the set of badges just changed (new refs mounted) — reposition immediately
    useEffect(() => {
        scheduleDraw();
    }, [warningUids, scheduleDraw]);

    return (
        <div ref={containerRef} className={"node-warning-annotations"}>
            {warningUids.map((uid) => (
                <div
                    key={uid}
                    ref={(el) => {
                        if (el) { badgeRefs.current.set(uid, el); } else { badgeRefs.current.delete(uid); }
                    }}
                    className={"node-warning-badge"}
                >
                    <svg viewBox="0 0 32 32" width={32} height={32}>
                        {/* Tail first, so the body below paints over it: its base is tucked well
                            inside the body and only the part past the bottom-right corner shows,
                            reading as an arrow emerging from behind the bubble. Tip at (30.5,
                            30.5) points at the node corner — see BADGE_CORNER_OFFSET. */}
                        <path
                            d="M24 15 L30.5 30.5 L15 24 Z"
                            fill="#ff9800"
                            stroke="#ff9800"
                            strokeWidth={2}
                            strokeLinejoin="round"
                        />
                        {/* bubble body: a plain rounded box (1..25), no tail notch needed */}
                        <path
                            d="M6 1 H20 A5 5 0 0 1 25 6 V20 A5 5 0 0 1 20 25 H6 A5 5 0 0 1 1 20 V6 A5 5 0 0 1 6 1 Z"
                            fill="#ffe3b3"
                            stroke="#ff9800"
                            strokeWidth={2}
                            strokeLinejoin="round"
                        />
                        {/* warning triangle, centred on the body at (13,13) */}
                        <path
                            d="M13 6.8 L20.2 19 H5.8 Z"
                            fill="#d96a06"
                            stroke="#d96a06"
                            strokeWidth={1.6}
                            strokeLinejoin="round"
                        />
                        <rect x="12.1" y="10.6" width="1.8" height="4.9" rx="0.9" fill="#fff6e6" />
                        <rect x="12.1" y="16.4" width="1.8" height="1.8" rx="0.9" fill="#fff6e6" />
                    </svg>
                </div>
            ))}
        </div>
    );
};
