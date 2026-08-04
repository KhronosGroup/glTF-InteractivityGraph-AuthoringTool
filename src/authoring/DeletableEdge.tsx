import {useEffect, useMemo, useSyncExternalStore} from "react";
import {
    BaseEdge,
    EdgeLabelRenderer,
    EdgeProps,
    getBezierPath,
    useReactFlow,
    useStore,
    useStoreApi,
} from "reactflow";

// how far (in screen px) inside each endpoint the "×" sits, and how close the cursor must get to reveal it
const BUTTON_INSET_PX = 40;
const REVEAL_RADIUS_PX = 80;

// Above this many registered anchors, the per-rAF O(E) cursor scan is too expensive,
// so hover-reveal is disabled instead of scanning every mousemove.
const HOVER_REVEAL_MAX_EDGES = 600;

type EdgeEnd = "source" | "target";
type Point = {x: number; y: number};
type Anchors = Record<EdgeEnd, Point>;

/**
 * Shared cursor tracker spanning all DeletableEdge instances. Each edge registers its two button
 * anchors (flow coordinates); a single mousemove listener finds the one anchor nearest to the
 * cursor within REVEAL_RADIUS_PX (screen px) and publishes it. So when several wires' reveal zones
 * overlap, only the closest end shows its "×" instead of every wire at once.
 */
const anchorRegistry = new Map<string, Anchors>();
const subscribers = new Set<() => void>();
let flowStore: ReturnType<typeof useStoreApi> | null = null;
let nearestId: string | null = null;
let nearestEnd: EdgeEnd | null = null;
let rafId = 0;
let lastEvent: MouseEvent | null = null;

const publishNearest = (id: string | null, end: EdgeEnd | null) => {
    if (id === nearestId && end === nearestEnd) {return}
    nearestId = id;
    nearestEnd = end;
    subscribers.forEach((notify) => notify());
};

const updateNearest = () => {
    rafId = 0;
    const state = flowStore?.getState();
    const domNode = state?.domNode;
    const event = lastEvent;
    if (!event || !state || !domNode) {return}
    if (!(event.target instanceof Node) || !domNode.contains(event.target)) {
        publishNearest(null, null);
        return;
    }
    // Hard cap: in very dense views, skip reveal instead of scanning thousands of anchors every rAF.
    if (anchorRegistry.size > HOVER_REVEAL_MAX_EDGES) {
        publishNearest(null, null);
        return;
    }
    const bounds = domNode.getBoundingClientRect();
    const [tx, ty, zoom] = state.transform;
    const cursorX = (event.clientX - bounds.left - tx) / zoom;
    const cursorY = (event.clientY - bounds.top - ty) / zoom;
    let bestId: string | null = null;
    let bestEnd: EdgeEnd | null = null;
    let bestDist = REVEAL_RADIUS_PX / zoom;
    anchorRegistry.forEach((anchors, id) => {
        for (const end of ["source", "target"] as EdgeEnd[]) {
            const a = anchors[end];
            const dx = a.x - cursorX;
            const dy = a.y - cursorY;
            // Cheap bounding-box reject before sqrt: if either axis exceeds bestDist,
            // this anchor cannot beat the current best.
            if (Math.abs(dx) > bestDist || Math.abs(dy) > bestDist) { continue; }
            const dist = Math.hypot(dx, dy);
            if (dist <= bestDist) {
                bestDist = dist;
                bestId = id;
                bestEnd = end;
            }
        }
    });
    publishNearest(bestId, bestEnd);
};

const scheduleUpdate = () => {
    if (!rafId && lastEvent) {rafId = requestAnimationFrame(updateNearest)}
};

const onMouseMove = (event: MouseEvent) => {
    lastEvent = event;
    scheduleUpdate();
};

const registerEdge = (id: string, anchors: Anchors) => {
    if (anchorRegistry.size === 0) {window.addEventListener("mousemove", onMouseMove)}
    anchorRegistry.set(id, anchors);
    // anchors can move under a stationary cursor (node drag), so re-evaluate from the last position
    scheduleUpdate();
};

const unregisterEdge = (id: string) => {
    anchorRegistry.delete(id);
    if (nearestId === id) {publishNearest(null, null)}
    if (anchorRegistry.size === 0) {
        window.removeEventListener("mousemove", onMouseMove);
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        // keep lastEvent: a re-register (zoom/drag re-runs the effect) re-evaluates from it,
        // since wheel-zoom moves the anchors without firing a mousemove
    }
};

const subscribeNearest = (notify: () => void) => {
    subscribers.add(notify);
    return () => {subscribers.delete(notify)};
};

/**
 * A bezier edge with a "×" delete button anchored just inside each endpoint. The button for an
 * endpoint appears only while the cursor is within REVEAL_RADIUS_PX of that anchor AND the anchor
 * is the nearest one across all edges, giving a fixed, predictable target near the sockets that
 * never stacks multiple buttons when wires run close together.
 *
 * Deletion is routed through react-flow's `deleteElements` so the graph's `onEdgesDelete` cleanup
 * (clearing the model + `linked` flags) still runs. The button is rendered through EdgeLabelRenderer,
 * which portals it outside the edge's DOM element.
 */
export const DeletableEdge = (props: EdgeProps) => {
    const {id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd} = props;
    const {deleteElements} = useReactFlow();
    const store = useStoreApi();
    // subscribe to zoom so the anchor inset stays consistent in screen px as you zoom
    const zoom = useStore((s) => s.transform[2]);

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // the two fixed button anchors, a little inside each endpoint (measured along the bezier)
    const anchors = useMemo(() => {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", edgePath);
        const total = p.getTotalLength();
        if (!total) {return null}
        const inset = Math.min(BUTTON_INSET_PX / zoom, total / 2);
        const s = p.getPointAtLength(inset);
        const e = p.getPointAtLength(total - inset);
        return {source: {x: s.x, y: s.y}, target: {x: e.x, y: e.y}};
    }, [edgePath, zoom]);

    useEffect(() => {
        flowStore = store;
        if (anchors === null) {return}
        registerEdge(id, anchors);
        return () => unregisterEdge(id);
    }, [id, anchors, store]);

    // which end of this edge (if any) currently owns the cursor
    const activeEnd = useSyncExternalStore(subscribeNearest, () => (nearestId === id ? nearestEnd : null));
    const point = activeEnd !== null && anchors !== null ? anchors[activeEnd] : null;
    const visible = point !== null;

    return (
        <>
            <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
            <EdgeLabelRenderer>
                <button
                    className="edge-delete-btn nodrag nopan"
                    style={{
                        transform: `translate(-50%, -50%) translate(${point?.x ?? labelX}px, ${point?.y ?? labelY}px)`,
                        opacity: visible ? 1 : 0,
                        pointerEvents: visible ? "all" : "none",
                    }}
                    title="Remove connection"
                    onClick={(event) => {
                        event.stopPropagation();
                        deleteElements({edges: [{id}]});
                    }}
                >
                    ×
                </button>
            </EdgeLabelRenderer>
        </>
    );
};
