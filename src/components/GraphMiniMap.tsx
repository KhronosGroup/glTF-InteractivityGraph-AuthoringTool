import React, { useCallback, useEffect, useRef } from "react";
import { Node, Panel, useReactFlow, useStoreApi } from "reactflow";
import { getNodeCategoryColor } from "../authoring/socketColors";
import { useDevicePixelRatio } from "../hooks/useDevicePixelRatio";

// Deliberately not reactflow's <MiniMap/>: that one mounts an SVG <rect> per node and re-renders
// the whole set through React on every node change, which is thousands of DOM nodes on the big
// graphs this map exists for. Here the nodes are painted into a single <canvas> (one fillRect
// each, no DOM), and the viewport indicator is a separate absolutely-positioned div so panning
// and zooming never repaint the node layer at all.

const MAP_WIDTH = 220;
const MAP_HEIGHT = 150;
const MAP_PADDING = 6;

// stand-ins matching frameGraph's, for nodes culling has never mounted (so reactflow never measured)
const UNMEASURED_NODE_WIDTH = 280;
const UNMEASURED_NODE_HEIGHT = 120;

// above this node count the node layer repaints at most every REPAINT_INTERVAL_MS while the graph
// is changing (i.e. during a node drag); the viewport rect stays at full frame rate regardless
const LARGE_GRAPH_NODE_COUNT = 1200;
const REPAINT_INTERVAL_MS = 100;

interface GraphBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** graph-space -> minimap-space mapping, recomputed whenever the graph bounds change */
interface MapTransform {
    scale: number;
    offsetX: number;
    offsetY: number;
}

export const GraphMiniMap = () => {
    const store = useStoreApi();
    const { setCenter } = useReactFlow();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const devicePixelRatio = useDevicePixelRatio();

    const mapTransformRef = useRef<MapTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
    // identity of the node collection the canvas was last painted from, so a pure viewport change
    // (pan/zoom, which leaves nodeInternals untouched) skips the repaint entirely
    const paintedNodesRef = useRef<unknown>(null);
    const lastPaintTimeRef = useRef(0);
    const frameRef = useRef<number | null>(null);
    const pendingRepaintRef = useRef(false);

    // paint the node layer and reposition the viewport rect; both read straight from the reactflow
    // store rather than from props, so this never depends on a React render happening first
    const draw = useCallback((forceNodeRepaint: boolean) => {
        const canvas = canvasRef.current;
        const state = store.getState();
        if (!canvas) { return; }

        const nodeInternals = state.nodeInternals;
        const nodesChanged = paintedNodesRef.current !== nodeInternals;

        if (nodesChanged || forceNodeRepaint) {
            const now = performance.now();
            const throttled = nodeInternals.size > LARGE_GRAPH_NODE_COUNT
                && now - lastPaintTimeRef.current < REPAINT_INTERVAL_MS;
            if (throttled) {
                // re-arm so the last drag frame is not the one we dropped
                pendingRepaintRef.current = true;
            } else {
                paintNodes(canvas, nodeInternals, mapTransformRef);
                paintedNodesRef.current = nodeInternals;
                lastPaintTimeRef.current = now;
                pendingRepaintRef.current = false;
            }
        }

        const viewport = viewportRef.current;
        if (viewport) {
            const [tx, ty, zoom] = state.transform;
            const { scale, offsetX, offsetY } = mapTransformRef.current;
            // visible graph-space rect, mapped into minimap space
            const left = (-tx / zoom) * scale + offsetX;
            const top = (-ty / zoom) * scale + offsetY;
            const width = (state.width / zoom) * scale;
            const height = (state.height / zoom) * scale;
            viewport.style.transform = `translate(${left}px, ${top}px)`;
            viewport.style.width = `${Math.max(width, 2)}px`;
            viewport.style.height = `${Math.max(height, 2)}px`;
        }
    }, [store]);

    // coalesce every store notification into at most one paint per frame
    const scheduleDraw = useCallback(() => {
        if (frameRef.current !== null) { return; }
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            draw(pendingRepaintRef.current);
            // a throttled-away repaint still owes us one final frame once the interval elapses
            if (pendingRepaintRef.current) { scheduleDraw(); }
        });
    }, [draw]);

    useEffect(() => {
        scheduleDraw();
        // subscribing to the whole store (rather than useStore with a selector) keeps the updates
        // out of React entirely: no re-render per pan frame, just a canvas/style write
        const unsubscribe = store.subscribe(scheduleDraw);
        return () => {
            unsubscribe();
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, [store, scheduleDraw]);

    // the canvas backing store is sized in device pixels (see paintNodes), so a ratio change needs
    // a forced repaint — nothing about the graph changed, so the normal "nodes changed" path
    // wouldn't fire and the map would stay at the old resolution
    useEffect(() => {
        draw(true);
    }, [devicePixelRatio, draw]);

    // click or drag anywhere on the map to move the viewport there
    const centerOnPointer = useCallback((clientX: number, clientY: number) => {
        const container = containerRef.current;
        if (!container) { return; }
        const rect = container.getBoundingClientRect();
        const { scale, offsetX, offsetY } = mapTransformRef.current;
        const graphX = (clientX - rect.left - offsetX) / scale;
        const graphY = (clientY - rect.top - offsetY) / scale;
        setCenter(graphX, graphY, { zoom: store.getState().transform[2], duration: 0 });
    }, [setCenter, store]);

    const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        centerOnPointer(event.clientX, event.clientY);
    }, [centerOnPointer]);

    const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) { return; }
        centerOnPointer(event.clientX, event.clientY);
    }, [centerOnPointer]);

    return (
        <Panel position={"bottom-right"} className={"nodrag nopan nowheel graph-minimap"}>
            <div
                ref={containerRef}
                className={"graph-minimap__body"}
                style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onContextMenu={(event) => event.preventDefault()}
            >
                <canvas ref={canvasRef} className={"graph-minimap__canvas"} />
                <div ref={viewportRef} className={"graph-minimap__viewport"} />
            </div>
        </Panel>
    );
};

/** bounding box of all nodes, using the LOD box for anything reactflow has not measured yet */
const getGraphBounds = (nodeInternals: Map<string, Node>): GraphBounds | null => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodeInternals.forEach((node) => {
        const { x, y } = node.positionAbsolute ?? node.position;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + (node.width ?? UNMEASURED_NODE_WIDTH));
        maxY = Math.max(maxY, y + (node.height ?? UNMEASURED_NODE_HEIGHT));
    });
    if (minX === Infinity) { return null; }
    return { x: minX, y: minY, width: Math.max(maxX - minX, 1), height: Math.max(maxY - minY, 1) };
};

const paintNodes = (
    canvas: HTMLCanvasElement,
    nodeInternals: Map<string, Node>,
    mapTransformRef: React.MutableRefObject<MapTransform>,
) => {
    // size the backing store to the device pixel ratio once; on a retina display an unscaled
    // canvas would paint the whole map blurry
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(MAP_WIDTH * dpr);
    const targetHeight = Math.round(MAP_HEIGHT * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) { return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    const bounds = getGraphBounds(nodeInternals);
    if (!bounds) {
        mapTransformRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
        return;
    }

    // fit the graph into the map, letterboxed, so x and y stay on the same scale
    const scale = Math.min(
        (MAP_WIDTH - 2 * MAP_PADDING) / bounds.width,
        (MAP_HEIGHT - 2 * MAP_PADDING) / bounds.height,
    );
    const offsetX = (MAP_WIDTH - bounds.width * scale) / 2 - bounds.x * scale;
    const offsetY = (MAP_HEIGHT - bounds.height * scale) / 2 - bounds.y * scale;
    mapTransformRef.current = { scale, offsetX, offsetY };

    // one pass, grouped by fill color: a fillStyle change is the expensive part of a fillRect run,
    // so nodes are bucketed by category color and each bucket painted in a single sequence
    const buckets = new Map<string, number[]>();
    const selected: number[] = [];
    nodeInternals.forEach((node) => {
        const { x, y } = node.positionAbsolute ?? node.position;
        const rect = [
            x * scale + offsetX,
            y * scale + offsetY,
            Math.max((node.width ?? UNMEASURED_NODE_WIDTH) * scale, 1),
            Math.max((node.height ?? UNMEASURED_NODE_HEIGHT) * scale, 1),
        ];
        if (node.selected) {
            selected.push(...rect);
            return;
        }
        const color = getNodeCategoryColor(node.type ?? node.data?.op ?? "");
        const bucket = buckets.get(color);
        if (bucket) { bucket.push(...rect); } else { buckets.set(color, rect); }
    });

    buckets.forEach((rects, color) => {
        ctx.fillStyle = color;
        for (let i = 0; i < rects.length; i += 4) {
            ctx.fillRect(rects[i], rects[i + 1], rects[i + 2], rects[i + 3]);
        }
    });

    if (selected.length > 0) {
        ctx.fillStyle = "#1a1a1a";
        for (let i = 0; i < selected.length; i += 4) {
            ctx.fillRect(selected[i], selected[i + 1], selected[i + 2], selected[i + 3]);
        }
    }
};
