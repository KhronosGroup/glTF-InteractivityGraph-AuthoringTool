import {useMemo, useRef, useState} from "react";
import {
    BaseEdge,
    EdgeLabelRenderer,
    EdgeProps,
    getBezierPath,
    useReactFlow,
    useStore,
} from "reactflow";

// how far (in screen px) inside each endpoint the "×" sits, and how close the cursor must get to reveal it
const BUTTON_INSET_PX = 40;
const REVEAL_RADIUS_PX = 80;

type EdgeEnd = "source" | "target";

/**
 * A bezier edge with a "×" delete button anchored just inside each endpoint. The button for an
 * endpoint appears only while the cursor enters a circular zone centered on that anchor, giving a
 * fixed, predictable target near the sockets (rather than chasing the wire) that stays reachable on
 * long wires. The reveal zone shares its center with the button so it feels consistent.
 *
 * Deletion is routed through react-flow's `deleteElements` so the graph's `onEdgesDelete` cleanup
 * (clearing the model + `linked` flags) still runs. The button is rendered through EdgeLabelRenderer,
 * which portals it outside the edge's DOM element, so hover is tracked with local state. The reveal
 * circles live in the edge SVG layer (below the node handles), so they don't block the sockets.
 */
export const DeletableEdge = (props: EdgeProps) => {
    const {id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd} = props;
    const {deleteElements} = useReactFlow();
    // subscribe to zoom so anchor inset / reveal radius stay consistent in screen px as you zoom
    const zoom = useStore((s) => s.transform[2]);
    const [activeEnd, setActiveEnd] = useState<EdgeEnd | null>(null);
    const [overBtn, setOverBtn] = useState(false);
    const lastEnd = useRef<EdgeEnd>("target");

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

    const radius = REVEAL_RADIUS_PX / zoom;
    const shownEnd = activeEnd ?? (overBtn ? lastEnd.current : null);
    const point = shownEnd !== null && anchors !== null ? anchors[shownEnd] : null;
    const visible = point !== null;

    const enter = (end: EdgeEnd) => {
        lastEnd.current = end;
        setActiveEnd(end);
    };

    return (
        <>
            <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
            {/* invisible circular reveal zones centered on each button anchor */}
            {anchors !== null && (["source", "target"] as EdgeEnd[]).map((end) => (
                <circle
                    key={end}
                    cx={anchors[end].x}
                    cy={anchors[end].y}
                    r={radius}
                    fill="transparent"
                    style={{pointerEvents: "all"}}
                    onMouseEnter={() => enter(end)}
                    onMouseLeave={() => setActiveEnd((cur) => (cur === end ? null : cur))}
                />
            ))}
            <EdgeLabelRenderer>
                <button
                    className="edge-delete-btn nodrag nopan"
                    style={{
                        transform: `translate(-50%, -50%) translate(${point?.x ?? labelX}px, ${point?.y ?? labelY}px)`,
                        opacity: visible ? 1 : 0,
                        pointerEvents: visible ? "all" : "none",
                    }}
                    title="Remove connection"
                    onMouseEnter={() => setOverBtn(true)}
                    onMouseLeave={() => setOverBtn(false)}
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
