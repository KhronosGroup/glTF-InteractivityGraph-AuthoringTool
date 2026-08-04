import ReactFlow, {
    addEdge, Background,
    Connection, ControlButton, Controls,
    Edge,
    Node,
    NodeChange,
    EdgeTypes,
    NodeTypes, Panel, useEdgesState, useNodesState, useReactFlow, XYPosition
} from 'reactflow';
import {AuthoringGraphNode, LOD_ZOOM_THRESHOLD} from "../authoring/AuthoringGraphNode";
import {DeletableEdge} from "../authoring/DeletableEdge";
import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {v4 as uuidv4} from "uuid";
import {RenderIf} from "./RenderIf";
import {Button, Col, Row, Form, OverlayTrigger, Popover, Tooltip} from "react-bootstrap";
import 'reactflow/dist/style.css';
import {buildNodeByUid, getNodeSpec, hasNodeSpecFlag, interactivityNodeSpecs, propagateGraphGroupTypes, propagateNodeGroupTypes, resolveOutputSocketType, standardTypes, toInteractivityDeclaration} from "../authoring/spec/nodes";
import { IInteractivityEvent, IInteractivityVariable } from '../BasicBehaveEngine/types/InteractivityGraph';
import { AuthoredGraph, AuthoredNode, AuthoredValue, NodeSpecFlag } from '../authoring/spec/AuthoredGraph';
import { InteractivityGraphContext, initialGraph } from '../InteractivityGraphContext';
import { IGraphDiagnostic } from '../diagnostics';
import { categoryLabel } from './DiagnosticsPanel';
import { FLOW_COLOR, getColorForTypeIndex, getNodeCategoryColor } from '../authoring/socketColors';
import { TypedValueInput } from '../authoring/TypedValueInput';
import { NodeInfoTooltip, buildNodeTypeTooltipSections } from '../authoring/NodeInfoTooltip';
import { LoadingProgressBar } from './LoadingProgressBar';
import { GraphMiniMap } from './GraphMiniMap';
import { NodeWarningAnnotations } from './NodeWarningAnnotations';
import { applyNodePreset, getNodePresetSearchText, NodePreset, nodePresets } from '../authoring/nodePresets';
import { reconcileNodeSockets } from '../authoring/socketReconciler';
import { joinSearchTerms } from '../authoring/searchText';
import { useFullscreen } from '../hooks/useFullscreen';
import { IconAddNode, IconCustomEvents, IconFullscreen, IconJsonView, IconLegend, IconNodeTypes, IconReload, IconSearch, IconVariables } from './toolbarIcons';
import '../css/flowNodes.css';

// navigator.userAgentData is Chromium-only, so fall back to the deprecated but universally
// supported platform/userAgent strings for the Mac check
const isMacPlatform = typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test((navigator as any).userAgentData?.platform ?? navigator.platform ?? navigator.userAgent);

const nodeTypes = interactivityNodeSpecs.reduce((nodes, node) => {
    nodes[node.op!] = (props: any) => {
        return <AuthoringGraphNode {...props} />;
    };
    return nodes;
}, {} as NodeTypes);

nodeTypes["NoOp"] = (props: any) => {
    props.data.isNoOp = true;
    return <AuthoringGraphNode {...props} />;
};

// override react-flow's built-in default edge so every wire (loaded or newly connected,
// none of which set an explicit type) gets the hover "×" delete button
const edgeTypes: EdgeTypes = {
    default: DeletableEdge,
};

// one end of a drag-connection: the node + handle it started from, and whether that handle is a
// source (output) or target (input). Used to decide which sockets to offer on the dropped-onto node.
interface WireEndpoint {
    nodeId: string;
    handleId: string;
    handleType: "source" | "target";
}

// a socket offered by the wire-drop socket picker
interface WireSocketCandidate {
    socket: string;
    label: string;
    color: string;
}

enum AuthoringComponentModelType {
    NODE_PICKER,
    GRAPH_SEARCH,
    JSON_VIEW,
    NODE_LIST,
    CUSTOM_EVENTS,
    VARIABLES,
    NONE
}

const MenuBarButton = (props: {id: string, icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void}) => (
    <button
        id={props.id}
        className={`graph-menu-bar-btn${props.isActive ? " is-active" : ""}`}
        onClick={props.onClick}
    >
        {props.icon}
        {props.label}
    </button>
);

const MenuBarDivider = () => <div className="graph-menu-bar-divider"/>;

// shared chrome for every in-graph overlay editor (Add Node, JSON View, Variables, ...): one card
// look, one close affordance, and sizing that follows the graph panel rather than the viewport
// (see .graph-overlay in flowNodes.css). `maxWidth` caps how wide the card may grow.
const GraphOverlayPanel = (props: {
    id: string;
    title: string;
    maxWidth: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) => (
    <Panel id={props.id} position={"top-center"} className={"graph-overlay"}>
        <div className={"graph-overlay__card"} style={{ maxWidth: props.maxWidth }}>
            <div className={"graph-overlay__header"}>
                <h3 className={"graph-overlay__title"}>{props.title}</h3>
                <Button variant={"outline-danger"} size={"sm"} onClick={props.onClose}>Close</Button>
            </div>
            <div className={"graph-overlay__body"}>
                {props.children}
            </div>
            {props.footer !== undefined && <div className={"graph-overlay__footer"}>{props.footer}</div>}
        </div>
    </Panel>
);

// Stand-in box for a node reactflow has not measured yet (i.e. one culling has never mounted),
// used only to compute the graph bounds in frameGraph. Matches the LOD box in flowNodes.css.
const UNMEASURED_NODE_WIDTH = 280;
const UNMEASURED_NODE_HEIGHT = 120;

const FRAME_MIN_ZOOM = 0.05;
const FRAME_PADDING = 0.1;

// nudges the user that node/socket/wiring edits don't auto-propagate to the running scene — the
// engine only (re)reads the graph when Play/Reload is pressed (see requestPlay in
// InteractivityGraphContext). Node drag position is intentionally excluded from "dirty" (see
// onNodeDragStop), since repositioning doesn't change what the engine executes.
const ReloadIndicator = (props: { dirty: boolean, onReload: () => void }) => {
    if (!props.dirty) { return null; }
    return (
        <button
            id={"reload-graph-btn"}
            className={"graph-menu-bar-btn graph-menu-bar-btn--reload"}
            onClick={props.onReload}
        >
            <IconReload/>
            Unplayed changes — Reload
        </button>
    );
};

// pinned to the right edge of the graph menu bar: total error/warning count across all
// diagnostics (extensions, node operations, data types, per-node spec validity). Hovering shows
// the full list; entries attributed to a specific node (currently only 'node'-category spec
// validity diagnostics) are clickable and pan/select that node on the canvas.
const DiagnosticsCounter = (props: { diagnostics: IGraphDiagnostic[], onJumpToNode: (nodeUid: string) => void }) => {
    // OverlayTrigger's built-in "hover" trigger only watches mouse enter/leave on the trigger
    // chip itself (see react-bootstrap's OverlayTrigger), not on the popover it renders via
    // portal. So the instant the cursor leaves the chip heading toward the popover below it,
    // the overlay was told to hide - closing before a click on any entry could land. Managing
    // `show` ourselves, and also listening for mouse enter/leave on the popover, keeps it open
    // while the cursor is over either element.
    const [show, setShow] = useState(false);
    const closeTimeoutRef = useRef<number | null>(null);

    const cancelClose = () => {
        if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };
    const openNow = () => {
        cancelClose();
        setShow(true);
    };
    const closeWithDelay = () => {
        cancelClose();
        closeTimeoutRef.current = window.setTimeout(() => setShow(false), 200);
    };

    if (props.diagnostics.length === 0) {
        return null;
    }
    const errorCount = props.diagnostics.filter((d) => d.severity === "error").length;
    const warningCount = props.diagnostics.length - errorCount;

    const popover = (
        <Popover
            id={"diagnostics-counter-popover"}
            className={"diagnostics-counter-popover"}
            onMouseEnter={openNow}
            onMouseLeave={closeWithDelay}
        >
            <Popover.Body>
                <ul className={"diagnostics-counter-list"}>
                    {props.diagnostics.map((d, index) => (
                        <li key={index} className={"diagnostics-counter-item"}>
                            <span className={`diagnostics-counter-badge diagnostics-counter-badge--${d.severity}`}>
                                {d.severity === "error" ? "✕" : "⚠"}
                            </span>
                            {d.nodeUid !== undefined ? (
                                <button
                                    type="button"
                                    className={"diagnostics-counter-item-btn"}
                                    onClick={() => { props.onJumpToNode(d.nodeUid!); setShow(false); }}
                                    title={"Jump to this node"}
                                >
                                    {d.nodeIndex !== undefined ? `Node #${d.nodeIndex}: ` : ""}{d.title}
                                </button>
                            ) : (
                                <span className={"diagnostics-counter-item-text"}>
                                    {categoryLabel[d.category]}: {d.title}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </Popover.Body>
        </Popover>
    );

    return (
        <OverlayTrigger placement={"bottom-end"} trigger={[]} show={show} overlay={popover}>
            <div
                className={"graph-diagnostics-counter"}
                tabIndex={0}
                onMouseEnter={openNow}
                onMouseLeave={closeWithDelay}
                onFocus={openNow}
                onBlur={closeWithDelay}
            >
                <RenderIf shouldShow={errorCount > 0}>
                    <span className={"diagnostics-counter-chip diagnostics-counter-chip--error"}>✕ {errorCount}</span>
                </RenderIf>
                <RenderIf shouldShow={warningCount > 0}>
                    <span className={"diagnostics-counter-chip diagnostics-counter-chip--warning"}>⚠ {warningCount}</span>
                </RenderIf>
            </div>
        </OverlayTrigger>
    );
};

export const AuthoringComponent = () => {
    const reactFlowRef = useRef<HTMLDivElement | null>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [authoringComponentModal, setAuthoringComponentModal] = useState<AuthoringComponentModelType>(AuthoringComponentModelType.NONE)
    // the input legend is a footer bar, not a modal, so it toggles independently of the overlays.
    // Off by default: it's a reference for newcomers, opened from the control stack when wanted.
    const [showInputLegend, setShowInputLegend] = useState<boolean>(false)
    const graphFullscreenState = useFullscreen(reactFlowRef);
    const graphFullscreen = graphFullscreenState.isFullscreen;
    const fullscreenFallback = graphFullscreenState.fallback;

    useEffect(() => {
        if (authoringComponentModal === AuthoringComponentModelType.NONE) {
            return;
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") {
                return;
            }
            event.preventDefault();
            setAuthoringComponentModal(AuthoringComponentModelType.NONE);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [authoringComponentModal]);

    // to handle nodes and edges in graph
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    // uids of every node that feeds (directly or transitively, via flow or value wiring) into the
    // single currently-selected node, so its full upstream hierarchy can be highlighted
    const [ancestorNodeIds, setAncestorNodeIds] = useState<Set<string>>(new Set());
    // ids of the edges connecting that upstream hierarchy, highlighted alongside the nodes
    const [ancestorEdgeIds, setAncestorEdgeIds] = useState<Set<string>>(new Set());

    const {graph, getAuthorGraph, addDeclaration, addNode, removeNode, liveDiagnostics, graphDirty, markGraphDirty, requestPlay, setLoadingState, runLiveValidation} = useContext(InteractivityGraphContext);
    // the graph object identity we last rebuilt the canvas from; a load replaces graph identity
    // (setGraph), which is the signal to rebuild — interactive edits mutate the same object in
    // place and leave identity untouched, so they never retrigger a rebuild
    const lastSyncedGraphRef = useRef<AuthoredGraph | null>(null);

    // Frame the whole graph in the viewport.
    //
    // Not reactflow's fitView: that one refuses to do anything at all unless *every* node has been
    // measured (`nodes.every(n => n.width && n.height)` — otherwise it returns false and leaves the
    // viewport untouched, with no error). Viewport culling means the nodes off-screen at load never
    // mount and so never get measured, which silently broke both the post-load framing and the
    // Controls "fit view" button on any graph bigger than one screenful. Compute the bounds from the
    // node positions we already have, substituting the LOD box for anything reactflow hasn't
    // measured, and hand them to fitBounds, which carries no such precondition.
    // set when framing was asked for while the panel had no size on screen (the graph editor is
    // hidden — see app-split__pane--hidden); fitBounds against a zero-size canvas would compute a
    // garbage viewport, so the request is replayed once the panel is shown again
    const pendingFrameRef = useRef(false);

    const frameGraph = useCallback((duration = 0) => {
        if (!reactFlowInstance) { return; }
        const rect = reactFlowRef.current?.getBoundingClientRect();
        if (rect === undefined || rect.width === 0 || rect.height === 0) {
            pendingFrameRef.current = true;
            return;
        }
        const flowNodes: Node[] = reactFlowInstance.getNodes();
        if (flowNodes.length === 0) { return; }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const flowNode of flowNodes) {
            const { x, y } = flowNode.position;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + (flowNode.width ?? UNMEASURED_NODE_WIDTH));
            maxY = Math.max(maxY, y + (flowNode.height ?? UNMEASURED_NODE_HEIGHT));
        }
        const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

        // Predict the zoom fitBounds would choose and, if it is below the floor, center on the graph
        // at the floor instead of fitting it (see FRAME_MIN_ZOOM).
        if (bounds.width > 0 && bounds.height > 0) {
            const fitZoom = Math.min(
                rect.width / (bounds.width * (1 + FRAME_PADDING)),
                rect.height / (bounds.height * (1 + FRAME_PADDING)),
            );
            if (fitZoom < FRAME_MIN_ZOOM) {
                reactFlowInstance.setCenter(
                    bounds.x + bounds.width / 2,
                    bounds.y + bounds.height / 2,
                    { zoom: FRAME_MIN_ZOOM, duration },
                );
                return;
            }
        }
        reactFlowInstance.fitBounds(bounds, { padding: FRAME_PADDING, duration });
    }, [reactFlowInstance]);

    // replay a frame request that was deferred because the panel was hidden, the moment it has a
    // size again (toggling the graph editor back on)
    useEffect(() => {
        const container = reactFlowRef.current;
        if (container === null || typeof ResizeObserver === "undefined") { return; }
        const observer = new ResizeObserver(() => {
            if (!pendingFrameRef.current) { return; }
            const { width, height } = container.getBoundingClientRect();
            if (width === 0 || height === 0) { return; }
            pendingFrameRef.current = false;
            frameGraph();
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [frameGraph]);

    // pan/select a node by id from the diagnostics counter popover
    const jumpToNode = useCallback((nodeUid: string) => {
        const target = nodes.find((n) => n.id === nodeUid);
        if (!target || !reactFlowInstance) { return; }
        setNodes((prev) => prev.map((n) => ({ ...n, selected: n.id === nodeUid })));
        const centerX = target.position.x + (target.width ?? UNMEASURED_NODE_WIDTH) / 2;
        const centerY = target.position.y + (target.height ?? UNMEASURED_NODE_HEIGHT) / 2;
        reactFlowInstance.setCenter(centerX, centerY, { zoom: 1, duration: 500 });
    }, [nodes, reactFlowInstance, setNodes]);

    const jumpToNodeIndex = useCallback((nodeIndex: number): boolean => {
        if (!Number.isInteger(nodeIndex) || nodeIndex < 0 || nodeIndex >= graph.nodes.length) { return false; }
        const targetUid = graph.nodes[nodeIndex]?.uid;
        if (targetUid === undefined) { return false; }
        jumpToNode(targetUid);
        return true;
    }, [graph.nodes, jumpToNode]);

    //to handle the node picker props
    const mousePosRef = useRef({x:0, y:0});
    const clipboardRef = useRef<Node[]>([]);

    // --- drop-a-wire-on-empty-canvas wiring ---
    // the socket a drag-connection started from (set in onConnectStart); drives opening the Add Node
    // menu and then a socket picker when the wire is released over empty canvas
    const connectStartRef = useRef<WireEndpoint | null>(null);
    // set true when the right mouse button is pressed mid-wire — cancels the gesture (no node, no wire)
    const connectCancelledRef = useRef(false);
    // removes the mid-wire right-button listener registered for the current gesture
    const connectCleanupRef = useRef<(() => void) | null>(null);
    // a wire whose far end is pending: the drop opened the Add Node menu; once a node is chosen we
    // reopen as a socket picker to choose which socket on that new node to attach to
    const pendingWireRef = useRef<{ from: WireEndpoint; clientX: number; clientY: number } | null>(null);
    const [socketPicker, setSocketPicker] = useState<{ newNodeUid: string; from: WireEndpoint; clientX: number; clientY: number } | null>(null);

    // Persist a node's canvas position into the graph model as soon as a drag ends (reactflow
    // passes every node moved in the gesture), rather than polling all nodes on a 5s timer. Only
    // dragged nodes changed position, so only they need writing back.
    const onNodeDragStop = useCallback((_e: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
        for (const dragged of draggedNodes) {
            const graphNode = graph.nodes.find(graphNode => graphNode.uid === dragged.id);
            if (graphNode !== undefined) {
                graphNode.metadata = {positionX: dragged.position.x, positionY: dragged.position.y};
            }
        }
    }, [graph])

    const hasIntersection = (arr1: any[], arr2: any[]): boolean => {
        const set1 = new Set(arr1);

        for (const item of arr2) {
            if (set1.has(item)) {
                return true;
            }
        }

        return false;
    }

    // Re-resolve `group` on `targetNode` and persist it onto the sockets whose type follows the
    // group (outputs + unwired, valueless inputs). Delegates to the shared writeback used at load
    // too (propagateNodeGroupTypes); `preferConnections=false` gives the live editor's precedence —
    // an unconnected sibling's own dropdown-picked type outranks a new wire.
    const propagateGroupType = (targetNode: AuthoredNode, group: string) => {
        propagateNodeGroupTypes(targetNode, graph.nodes, false, group);
    };

    // Force a node's own component to re-render after we've directly mutated its model data from
    // here (outside its own React state, as typeGroup propagation does), by replacing its `data`
    // object with a shallow copy so the reference changes.
    const bumpNodeData = useCallback((nodeId: string) => {
        setNodes((nds: Node[]) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data } } : n)));
    }, [setNodes]);

    // recolor a node's outgoing value edges to match its current output socket types
    // (called by nodes when a type changes, e.g. via the type dropdown or Pointer Type config)
    const recolorEdges = useCallback((nodeId: string) => {
        setEdges((eds: Edge[]) => {
            const sourceNode = graph.nodes.find(n => n.uid === nodeId);
            if (sourceNode === undefined) {
                return eds;
            }
            // Every node's mount reconcile calls this, so on a large graph it runs once per node
            // over the full edge list. Keep the array identity when no color actually changed, so
            // reactflow re-renders its edges only for a real recolor rather than on every mount.
            let changed = false;
            const next = eds.map((edge) => {
                if (edge.source !== nodeId) {
                    return edge;
                }
                // flow edges keep the flow color
                if (sourceNode.flows?.output?.[edge.sourceHandle!] !== undefined) {
                    return edge;
                }
                const stroke = getColorForTypeIndex(resolveOutputSocketType(sourceNode, edge.sourceHandle!, graph.nodes));
                if ((edge.style as any)?.stroke === stroke) {
                    return edge;
                }
                changed = true;
                return { ...edge, style: { ...(edge.style || {}), stroke, strokeWidth: 2 } };
            });
            return changed ? next : eds;
        });
    }, [graph]);

    // `nodeId`'s output types just changed (type dropdown, `type`/`pointer` config, a wire added or
    // removed), so every node consuming them must re-resolve its own types, wire colors and render.
    // Walks the value wires breadth-first, continuing past a consumer only when its own outputs
    // actually moved — that stopping rule keeps an edit from cascading over the whole graph.
    const refreshValueConsumers = useCallback((nodeId: string) => {
        // source uid -> nodes wired to it; built per call since the model is mutated in place
        const consumers = new Map<string, AuthoredNode[]>();
        for (const n of graph.nodes) {
            if (n.uid === undefined) { continue; }
            for (const value of Object.values(n.values?.input ?? {})) {
                if (value?.node === undefined) { continue; }
                const key = String(value.node);
                const list = consumers.get(key);
                if (list === undefined) { consumers.set(key, [n]); }
                else if (!list.includes(n)) { list.push(n); }
            }
        }
        if (consumers.size === 0) { return; }

        const queue = [nodeId];
        const seen = new Set<string>([nodeId]);
        const touched = new Set<string>();
        while (queue.length > 0) {
            for (const consumer of consumers.get(queue.shift()!) ?? []) {
                const uid = consumer.uid!;
                if (seen.has(uid)) { continue; }
                seen.add(uid);
                touched.add(uid);
                // preferConnections=false: live-editor precedence, as on the connect path
                if (propagateNodeGroupTypes(consumer, graph.nodes, false)) { queue.push(uid); }
            }
        }
        if (touched.size === 0) { return; }

        // one edge-list pass for all touched sources, instead of recolorEdges per node
        setEdges((eds: Edge[]) => {
            let changed = false;
            const next = eds.map((edge) => {
                if (!touched.has(edge.source)) { return edge; }
                const sourceNode = graph.nodes.find(n => n.uid === edge.source);
                if (sourceNode === undefined || sourceNode.flows?.output?.[edge.sourceHandle!] !== undefined) { return edge; }
                const stroke = getColorForTypeIndex(resolveOutputSocketType(sourceNode, edge.sourceHandle!, graph.nodes));
                if ((edge.style as any)?.stroke === stroke) { return edge; }
                changed = true;
                return { ...edge, style: { ...(edge.style || {}), stroke, strokeWidth: 2 } };
            });
            return changed ? next : eds;
        });
        // in-place propagation doesn't change node identity, so bump `data` to force a re-read
        setNodes((nds: Node[]) => nds.map((n) => (touched.has(n.id) ? { ...n, data: { ...n.data } } : n)));
    }, [graph, setEdges, setNodes]);

    // handle creation and deletion of edges
    const onConnect = useCallback((vals: Edge<any> | Connection) => {
        const sourceNodeId = vals.source;
        const sourceNode: AuthoredNode = graph.nodes.find(node => node.uid === sourceNodeId)!;

        const targetNodeId = vals.target;
        const targetNode: AuthoredNode = graph.nodes.find(node => node.uid === targetNodeId)!;

        if (sourceNodeId === targetNodeId) {return}

        // flow/sequence and flow/multiGate add their output flow sockets dynamically, so a
        // freshly-added output handle won't exist in flows.output yet even though it is a flow
        // socket; treat those nodes' outputs as flow regardless.
        const isDynamicFlowSourceNode = hasNodeSpecFlag(getNodeSpec(sourceNode.op), NodeSpecFlag.DynamicFlowOutputs);

        // if one is flow and one isn't then do not connect
        const sourceIsFlow = sourceNode.flows?.output?.[vals.sourceHandle!] !== undefined || isDynamicFlowSourceNode;
        const targetIsFlow = targetNode.flows?.input?.[vals.targetHandle!] !== undefined;
        if (targetIsFlow !== sourceIsFlow) {return}

        if (!sourceIsFlow && !targetIsFlow) {
            // make sure the valueTypes are compatible; only enforce this when both sockets
            // actually declare typeOptions. A configurable node's dynamic socket that hasn't
            // been typed yet (e.g. before its driving configuration is set) is left
            // unconstrained, but a socket with a clear, fixed type — including dynamic ones
            // like event/send's per-parameter inputs once an event is selected — must reject
            // an incompatible wire outright instead of accepting it and then losing its type
            // once disconnected again. (Previously this whole check was skipped for any node
            // with *any* configuration, which let mismatched wires onto fixed-type sockets.)
            const sourceValueTypes = sourceNode.values?.output?.[vals.sourceHandle!]?.typeOptions;
            const targetValueTypes = targetNode.values?.input?.[vals.targetHandle!]?.typeOptions;
            if (sourceValueTypes !== undefined && targetValueTypes !== undefined && !hasIntersection(sourceValueTypes, targetValueTypes)) {return}
        }

        if (sourceIsFlow || targetIsFlow) {
            if (sourceNode.op === "flow/sequence") {
                // if the source node is a flow/sequence, we need to dyanmically add outflows since they are not defined in the template
                sourceNode.flows = sourceNode.flows || {};
                sourceNode.flows.output = sourceNode.flows.output || {};
            }
            sourceNode!.flows!.output![vals.sourceHandle!] = {node: targetNode.uid, socket: vals.targetHandle!}
        } else {
            // capture the target socket's group, description and (for sockets with no typeGroup,
            // i.e. a fixed type) its type/typeOptions before they're overwritten with the
            // {node, socket} link below — the link would otherwise drop this metadata, and for
            // dynamic per-node sockets (e.g. event/send's event-parameter inputs) it isn't
            // recoverable from the static spec later, which left the socket typeless ("?") once
            // disconnected again
            const existingTarget = targetNode.values?.input?.[vals.targetHandle!];
            const specTarget = getNodeSpec(targetNode.op)?.values?.input?.[vals.targetHandle!];
            const targetGroup = existingTarget?.typeGroup ?? specTarget?.typeGroup;
            const targetDescription = existingTarget?.description ?? specTarget?.description;
            const targetType = existingTarget?.type ?? specTarget?.type;
            const targetTypeOptions = existingTarget?.typeOptions ?? specTarget?.typeOptions;
            targetNode!.values!.input![vals.targetHandle!] = {
                node: sourceNode.uid,
                socket: vals.sourceHandle!,
                ...(targetDescription !== undefined ? { description: targetDescription } : {}),
                ...(targetGroup !== undefined
                    ? { typeGroup: targetGroup }
                    : (targetType !== undefined ? { type: targetType, typeOptions: targetTypeOptions } : {})),
            }

            if (targetGroup !== undefined) {
                // re-resolve the group (a static value on a sibling still wins over this new wire)
                // and persist it onto the followers + outputs
                propagateGroupType(targetNode, targetGroup);
            }
            // re-render the target for *every* value connection, not just a grouped one: hiding its
            // value input/type dropdown and adopting the source's type are all model-driven renders.
            // Previously done by writing style.display onto the DOM, which React never undid.
            recolorEdges(targetNodeId!);
            bumpNodeData(targetNodeId!);
            refreshValueConsumers(targetNodeId!);
        }

        // color the wiring by the source socket type (or flow color for flow connections)
        const edgeColor = sourceIsFlow
            ? FLOW_COLOR
            : getColorForTypeIndex(resolveOutputSocketType(sourceNode, vals.sourceHandle!, graph.nodes));
        setEdges((eds: any) => {
            // a value input socket can only ever be driven by one wire (matches the data
            // model above, which overwrites targetNode.values.input[handle] rather than
            // appending) — drop any pre-existing edge into this exact target socket first.
            // Flow input sockets are exempt: multiple flow wires legitimately fan into one.
            let filtered = targetIsFlow
                ? eds
                : eds.filter((e: any) => !(e.target === vals.target && e.targetHandle === vals.targetHandle));
            // a flow output socket can likewise only ever point to one target (flows.output[handle]
            // above is overwritten, not appended) — value output sockets are exempt since one
            // value legitimately fans out to many inputs.
            if (sourceIsFlow) {
                filtered = filtered.filter((e: any) => !(e.source === vals.source && e.sourceHandle === vals.sourceHandle));
            }
            return addEdge({ ...vals, style: { stroke: edgeColor, strokeWidth: 2 } }, filtered);
        });
        markGraphDirty();
    }, [nodes, graph, bumpNodeData, recolorEdges, refreshValueConsumers]);

    // when a dynamic flow output socket (flow/sequence, flow/multiGate) is renamed, retarget any
    // edge leaving that socket so the wiring survives the rename
    const renameFlowSocket = useCallback((nodeId: string, oldName: string, newName: string) => {
        setEdges((eds: Edge[]) => eds.map((edge) =>
            (edge.source === nodeId && edge.sourceHandle === oldName)
                ? { ...edge, sourceHandle: newName }
                : edge
        ));
    }, []);

    const onEdgesDelete = useCallback((edges: Edge[]) => {
        console.log("edges", edges);
        for (let i = 0; i < edges.length; i++) {
            const edge = edges[i];

            const sourceNode = graph.nodes.find(node => node.uid === edge.source);
            const targetNode = graph.nodes.find(node => node.uid === edge.target);
            // deleting a node deletes its edges, so an endpoint may already be gone from the model
            if (sourceNode === undefined || targetNode === undefined) { continue; }
            const isFlowConnection = sourceNode.flows?.output?.[edge.sourceHandle!] !== undefined;

            if (isFlowConnection) {
                // flow so we should remove the flow value from the node
                sourceNode!.flows!.output![edge.sourceHandle!] = {};
            } else {
                // value so we should remove the value from the target node — restore its spec
                // default (preserving typeOptions/typeGroup/description) rather than leaving a bare
                // {} that would permanently strip the socket's type metadata. Dynamic per-node
                // sockets (e.g. event/send's event-parameter inputs, pointer/message template
                // slots) have no entry in the static spec at all, so fall back to whatever
                // type/typeOptions/typeGroup/description the socket itself carried while it was
                // connected (preserved there by onConnect) rather than leaving it typeless ("?").
                const existing = targetNode.values?.input?.[edge.targetHandle!];
                const spec = getNodeSpec(targetNode.op);
                const specDefault = spec?.values?.input?.[edge.targetHandle!];
                const source = specDefault ?? existing;
                // a socket restricted to bool alone renders as a checkbox, which always shows as
                // checked/unchecked — defaulting it to `false` instead of `undefined` keeps the
                // stored value consistent with what the checkbox already displays
                const isPureBoolSocket = source?.typeOptions?.length === 1 && source.typeOptions[0] === 0;
                const restored: AuthoredValue = source !== undefined ? {
                    ...(source.type !== undefined ? { type: source.type } : {}),
                    ...(source.typeOptions !== undefined ? { typeOptions: source.typeOptions } : {}),
                    ...(source.typeGroup !== undefined ? { typeGroup: source.typeGroup } : {}),
                    ...(source.description !== undefined ? { description: source.description } : {}),
                    value: [isPureBoolSocket ? false : undefined],
                } : {};
                targetNode!.values!.input![edge.targetHandle!] = restored;

                if (restored.typeGroup !== undefined) {
                    propagateGroupType(targetNode, restored.typeGroup);
                }
                // same model-driven re-render as the connect path above
                recolorEdges(targetNode.uid!);
                bumpNodeData(edge.target!);
                refreshValueConsumers(targetNode.uid!);
            }
        }
        markGraphDirty();
    }, [graph, bumpNodeData, recolorEdges, refreshValueConsumers]);

    const onNodesDelete = useCallback((nodes: Node[]) => {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            removeNode(node.id);
        }
    }, [removeNode]);

    // handle adding nodes and edges to the graph. Returns the new node's uid so callers (e.g. the
    // drop-a-wire-on-empty-canvas flow) can then wire a socket on it.
    const onAddNode = useCallback((nodeRequest: string | NodePreset, position: XYPosition): string => {
        const nodeType = typeof nodeRequest === "string" ? nodeRequest : nodeRequest.op;
        const uid = uuidv4();
        const nodeToAdd = {
            id: uid,
            type: nodeType,
            position: position,
            data: {events: graph.events, variables: graph.variables, types: standardTypes, uid: uid, op: nodeType, recolorEdges: recolorEdges, refreshValueConsumers: refreshValueConsumers, renameFlowSocket: renameFlowSocket}
        };

        const spec = getNodeSpec(nodeType)!;
        let interactivityNode: AuthoredNode = JSON.parse(JSON.stringify(spec));
        interactivityNode.declaration = addDeclaration(toInteractivityDeclaration(spec));
        interactivityNode.uid = uid;
        if (typeof nodeRequest !== "string") {
            // applyNodePreset runs the socket reconciliation itself
            interactivityNode = applyNodePreset(interactivityNode, nodeRequest, {
                nodeType,
                events: graph.events ?? {},
                variables: graph.variables ?? [],
            });
        } else {
            // materialise config-driven sockets before the node enters the model, so the model is
            // complete the moment it's added — not one mount-reconcile later (the debounced live
            // validation may look at it in between)
            const reconciled = reconcileNodeSockets({
                op: nodeType,
                isNoOp: false,
                configuration: interactivityNode.configuration ?? {},
                inputValues: interactivityNode.values?.input ?? {},
                outputValues: interactivityNode.values?.output ?? {},
                inputFlows: interactivityNode.flows?.input ?? {},
                outputFlows: interactivityNode.flows?.output ?? {},
                events: graph.events ?? {},
                variables: graph.variables ?? [],
            });
            interactivityNode.values = { input: reconciled.inputValues, output: reconciled.outputValues };
            interactivityNode.flows = { input: reconciled.inputFlows, output: reconciled.outputFlows };
        }

        addNode(interactivityNode);

        onNodesChange([{type: "add", item: nodeToAdd}]);

        // below the LOD threshold the new node would render as the flat LOD box, so zoom in to it —
        // otherwise leave the user's zoom/pan alone
        if (reactFlowInstance && reactFlowInstance.getZoom() < LOD_ZOOM_THRESHOLD) {
            reactFlowInstance.setCenter(
                position.x + UNMEASURED_NODE_WIDTH / 2,
                position.y + UNMEASURED_NODE_HEIGHT / 2,
                { zoom: 1, duration: 500 },
            );
        }

        return uid;
    }, [graph, reactFlowInstance]);

    // a drag-connection started from a handle: remember where, and start watching for a right-click
    // (which cancels the whole gesture — see onConnectEnd)
    const onConnectStart = useCallback((_e: any, params: { nodeId: string | null; handleId: string | null; handleType: "source" | "target" | null }) => {
        connectCancelledRef.current = false;
        connectStartRef.current = (params.nodeId && params.handleId && params.handleType)
            ? { nodeId: params.nodeId, handleId: params.handleId, handleType: params.handleType }
            : null;
        connectCleanupRef.current?.();
        const onMouseDown = (ev: MouseEvent) => { if (ev.button === 2) { connectCancelledRef.current = true; } };
        window.addEventListener("mousedown", onMouseDown, true);
        connectCleanupRef.current = () => window.removeEventListener("mousedown", onMouseDown, true);
    }, []);

    // a drag-connection ended. If it was cancelled by a right-click, or landed on a handle (which
    // reactflow's onConnect already handled), do nothing. If it was dropped on empty canvas, open the
    // Add Node menu at that spot — the pending wire is finished once a node + socket are picked.
    const onConnectEnd = useCallback((e: any) => {
        connectCleanupRef.current?.();
        connectCleanupRef.current = null;
        const from = connectStartRef.current;
        connectStartRef.current = null;
        if (!from) { return; }
        if (connectCancelledRef.current) { connectCancelledRef.current = false; return; }
        const target = e?.target as Element | null;
        if (!target?.classList?.contains("react-flow__pane") || !reactFlowInstance) { return; }
        const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX;
        const clientY = e.clientY ?? e.changedTouches?.[0]?.clientY;
        const bounds = reactFlowRef.current!.getBoundingClientRect();
        mousePosRef.current = reactFlowInstance.project({ x: clientX - bounds.left, y: clientY - bounds.top });
        pendingWireRef.current = { from, clientX, clientY };
        setAuthoringComponentModal(AuthoringComponentModelType.NODE_PICKER);
    }, [reactFlowInstance]);

    // picking a node from the Add Node menu: add it, and if this menu was opened by dropping a wire,
    // finish the wire — auto-connecting when the new node offers exactly one compatible socket, or
    // otherwise opening a socket picker to choose among them
    const handlePickNode = (nodeRequest: string | NodePreset, position: XYPosition): string => {
        const uid = onAddNode(nodeRequest, position);
        const pending = pendingWireRef.current;
        pendingWireRef.current = null;
        if (pending && uid) {
            const candidates = getWireSocketCandidates(pending.from, uid);
            if (candidates.length === 1) {
                // only one place the wire can go — skip the picker and connect straight to it. Defer a
                // couple frames so the just-added node has mounted and registered its reactflow handles
                // (otherwise the edge can't attach), mirroring the load path's handle-settle wait.
                requestAnimationFrame(() => requestAnimationFrame(() =>
                    connectWireToSocket(pending.from, uid, candidates[0].socket)
                ));
            } else if (candidates.length > 1) {
                setSocketPicker({ newNodeUid: uid, from: pending.from, clientX: pending.clientX, clientY: pending.clientY });
            }
        }
        return uid;
    };

    // close the Add Node menu; also drop any pending wire (the user dismissed the menu without
    // choosing a node, so there is no far end to wire)
    const closeNodePicker = useCallback(() => {
        pendingWireRef.current = null;
        setAuthoringComponentModal(AuthoringComponentModelType.NONE);
    }, []);

    // the sockets on the freshly-added node that a dropped wire can attach to: a wire from an OUTPUT
    // offers the new node's INPUTs, a wire from an INPUT offers its OUTPUTs — always matching flow vs
    // value, and (for value wires) filtered to type-compatible sockets, mirroring onConnect's guards
    const getWireSocketCandidates = (from: WireEndpoint, newNodeUid: string): WireSocketCandidate[] => {
        const fromNode = graph.nodes.find(n => n.uid === from.nodeId);
        const newNode = graph.nodes.find(n => n.uid === newNodeUid);
        if (!fromNode || !newNode) { return []; }
        const candidates: WireSocketCandidate[] = [];
        if (from.handleType === "source") {
            const isDynFlow = hasNodeSpecFlag(getNodeSpec(fromNode.op), NodeSpecFlag.DynamicFlowOutputs);
            const fromIsFlow = fromNode.flows?.output?.[from.handleId] !== undefined || isDynFlow;
            if (fromIsFlow) {
                for (const socket of Object.keys(newNode.flows?.input ?? {})) {
                    candidates.push({ socket, label: socket, color: FLOW_COLOR });
                }
            } else {
                const fromType = resolveOutputSocketType(fromNode, from.handleId, graph.nodes);
                for (const [socket, value] of Object.entries(newNode.values?.input ?? {})) {
                    const opts = value.typeOptions;
                    if (opts === undefined || fromType === undefined || opts.includes(fromType)) {
                        candidates.push({ socket, label: socket, color: getColorForTypeIndex(fromType) });
                    }
                }
            }
        } else {
            const fromIsFlow = fromNode.flows?.input?.[from.handleId] !== undefined || from.handleId === "in";
            if (fromIsFlow) {
                for (const socket of Object.keys(newNode.flows?.output ?? {})) {
                    candidates.push({ socket, label: socket, color: FLOW_COLOR });
                }
            } else {
                const fromOpts = fromNode.values?.input?.[from.handleId]?.typeOptions;
                for (const socket of Object.keys(newNode.values?.output ?? {})) {
                    const outType = resolveOutputSocketType(newNode, socket, graph.nodes);
                    if (fromOpts === undefined || outType === undefined || fromOpts.includes(outType)) {
                        candidates.push({ socket, label: socket, color: getColorForTypeIndex(outType) });
                    }
                }
            }
        }
        return candidates;
    };

    // derive what the Add Node menu should offer to finish the pending dropped wire (see PickerConstraint):
    // flow wires require a matching flow socket; value wires require a type-compatible value socket,
    // mirroring the type checks in getWireSocketCandidates. null when there is no pending wire.
    const getPendingPickerConstraint = (): PickerConstraint => {
        const from = pendingWireRef.current?.from;
        if (!from) { return null; }
        const fromNode = graph.nodes.find(n => n.uid === from.nodeId);
        if (!fromNode) { return null; }
        if (from.handleType === "source") {
            const isDynFlow = hasNodeSpecFlag(getNodeSpec(fromNode.op), NodeSpecFlag.DynamicFlowOutputs);
            const fromIsFlow = fromNode.flows?.output?.[from.handleId] !== undefined || isDynFlow;
            if (fromIsFlow) { return { kind: "flow", direction: "input" }; }
            return { kind: "valueInput", fromType: resolveOutputSocketType(fromNode, from.handleId, graph.nodes) };
        }
        const fromIsFlow = fromNode.flows?.input?.[from.handleId] !== undefined || from.handleId === "in";
        if (fromIsFlow) { return { kind: "flow", direction: "output" }; }
        return { kind: "valueOutput", fromOpts: fromNode.values?.input?.[from.handleId]?.typeOptions };
    };

    // build the connection (orienting source/target by which end the wire started from) and hand it
    // to the normal onConnect path
    const connectWireToSocket = (from: WireEndpoint, newNodeUid: string, socket: string) => {
        const connection: Connection = from.handleType === "source"
            ? { source: from.nodeId, sourceHandle: from.handleId, target: newNodeUid, targetHandle: socket }
            : { source: newNodeUid, sourceHandle: socket, target: from.nodeId, targetHandle: from.handleId };
        onConnect(connection);
    };

    // the user chose a socket from the picker
    const completeWireToSocket = (socket: string) => {
        if (!socketPicker) { return; }
        connectWireToSocket(socketPicker.from, socketPicker.newNodeUid, socket);
        setSocketPicker(null);
    };

    const copySelectedNodes = useCallback(() => {
        clipboardRef.current = nodes.filter(n => n.selected);
    }, [nodes]);

    const pasteNodes = useCallback(() => {
        if (clipboardRef.current.length === 0) return;
        const OFFSET = 40;
        const copiedIds = new Set(clipboardRef.current.map(n => n.id));
        const uidMap = new Map<string, string>();
        for (const node of clipboardRef.current) uidMap.set(node.id, uuidv4());

        const newGraphNodes: AuthoredNode[] = [];
        const newFlowNodes: Node[] = [];

        for (const node of clipboardRef.current) {
            const newUid = uidMap.get(node.id)!;
            const srcGn = graph.nodes.find(n => n.uid === node.id);
            if (!srcGn) continue;
            const newGn: AuthoredNode = JSON.parse(JSON.stringify(srcGn));
            newGn.uid = newUid;
            if (newGn.flows?.output) {
                for (const key of Object.keys(newGn.flows.output)) {
                    const ref = newGn.flows.output[key];
                    if (ref.node && copiedIds.has(String(ref.node))) ref.node = uidMap.get(String(ref.node))!;
                    else newGn.flows.output[key] = {};
                }
            }
            if (newGn.values?.input) {
                for (const key of Object.keys(newGn.values.input)) {
                    const ref = newGn.values.input[key];
                    // an unwired socket carries the user's static value + its resolved type - clearing
                    // it here dropped both and let the reconcile below snap the socket back to the
                    // spec's placeholder type
                    if (ref.node === undefined) continue;
                    if (copiedIds.has(String(ref.node))) {
                        ref.node = uidMap.get(String(ref.node))!;
                    } else {
                        // wired to a node outside the copied set: sever the link but keep the socket's
                        // type/typeOptions/typeGroup so it doesn't lose its resolved type
                        const {node: _node, socket: _socket, ...rest} = ref;
                        newGn.values.input[key] = {...rest, value: [undefined]};
                    }
                }
            }
            // reconcile now instead of leaving the severed `{}` link stubs above for the mount
            // reconcile to repair — the pasted node must be model-complete the moment it's added
            // (the debounced live validation may look at it before it mounts)
            {
                const reconciled = reconcileNodeSockets({
                    op: newGn.op,
                    isNoOp: getNodeSpec(newGn.op) === undefined,
                    configuration: newGn.configuration ?? {},
                    inputValues: newGn.values?.input ?? {},
                    outputValues: newGn.values?.output ?? {},
                    inputFlows: newGn.flows?.input ?? {},
                    outputFlows: newGn.flows?.output ?? {},
                    events: graph.events ?? {},
                    variables: graph.variables ?? [],
                });
                newGn.values = { input: reconciled.inputValues, output: reconciled.outputValues };
                newGn.flows = { input: reconciled.inputFlows, output: reconciled.outputFlows };
            }
            newGraphNodes.push(newGn);
            newFlowNodes.push({
                id: newUid,
                type: node.type,
                position: { x: node.position.x + OFFSET, y: node.position.y + OFFSET },
                data: { ...node.data, uid: newUid, recolorEdges, refreshValueConsumers, renameFlowSocket },
            } as Node);
        }

        for (const gn of newGraphNodes) {
            if (gn.op) {
                const spec = getNodeSpec(gn.op);
                if (spec) addDeclaration(toInteractivityDeclaration(spec));
            }
            addNode(gn);
        }
        onNodesChange(newFlowNodes.map(n => ({ type: 'add' as const, item: n })));

        const newEdges: Edge[] = [];
        for (const gn of newGraphNodes) {
            if (gn.flows?.output) {
                for (const [handle, ref] of Object.entries(gn.flows.output)) {
                    if (ref.node) newEdges.push({
                        id: `paste-f-${gn.uid}-${handle}`,
                        source: gn.uid!, target: String(ref.node),
                        sourceHandle: handle, targetHandle: ref.socket ?? null,
                        style: { stroke: FLOW_COLOR, strokeWidth: 2 },
                    });
                }
            }
            if (gn.values?.input) {
                for (const [handle, ref] of Object.entries(gn.values.input)) {
                    if (ref.node) {
                        const srcGn = newGraphNodes.find(n => n.uid === ref.node);
                        if (srcGn) {
                            const stroke = getColorForTypeIndex(resolveOutputSocketType(srcGn, ref.socket!, newGraphNodes));
                            newEdges.push({
                                id: `paste-v-${ref.node}-${ref.socket}-${gn.uid}-${handle}`,
                                source: String(ref.node), target: gn.uid!,
                                sourceHandle: ref.socket ?? null, targetHandle: handle,
                                style: { stroke, strokeWidth: 2 },
                            });
                        }
                    }
                }
            }
        }
        if (newEdges.length > 0) setEdges(eds => [...eds, ...newEdges]);
    }, [graph, nodes, addDeclaration, addNode, onNodesChange, setEdges, recolorEdges, refreshValueConsumers, renameFlowSocket]);

    const duplicateSelectedNodes = useCallback(() => {
        const prev = clipboardRef.current;
        clipboardRef.current = nodes.filter(n => n.selected);
        pasteNodes();
        clipboardRef.current = prev;
    }, [nodes, pasteNodes]);

    // Rebuild the canvas from the model whenever a *new* graph is loaded. loadGraphFromJson swaps
    // the graph object's identity (setGraph); interactive edits keep the same object, so this only
    // fires on load. Needs the reactflow instance for fitView, so a load that lands before the
    // instance is ready leaves lastSyncedGraphRef untouched and retries once the instance arrives.
    useEffect(() => {
        if (graph === lastSyncedGraphRef.current) { return; }
        // the untouched initial graph means nothing has been loaded yet — don't rebuild. Any real
        // load (even of an empty graph) replaces identity via setGraph, so it won't match this.
        if (graph === initialGraph) { return; }
        if (!reactFlowInstance) { return; }
        lastSyncedGraphRef.current = graph;

        // A newer load supersedes this rebuild: setGraph swaps identity, re-running this effect; the
        // cleanup flips `cancelled` so the in-flight async build bails at its next checkpoint instead
        // of interleaving batches / stale state onto the newer graph.
        let cancelled = false;
        const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        const rebuild = async () => {
            // "Arranging": lay out nodes and build edges. Types are deferred (deferTypes) so value
            // wires come back painted neutral gray and the expensive per-edge type resolve is skipped
            // here — they're recolored once propagation runs below.
            setLoadingState({ active: true, step: "Arranging", progress: 0.78 });
            const result = getAuthorGraph(graph, { deferTypes: true });
            const loadedNodes: Node[] = result[0];
            const loadedEdges: Edge[] = result[1];
            // one uid index for the position writeback below; a .find per node made this loop
            // O(n²) and it runs synchronously, freezing the main thread on a large graph
            const modelByUid = buildNodeByUid(graph.nodes);
            for (const node of loadedNodes) {
                node.data.op = node.type;
                node.data.recolorEdges = recolorEdges;
                node.data.refreshValueConsumers = refreshValueConsumers;
                node.data.renameFlowSocket = renameFlowSocket;
                if (getNodeSpec(node.data.op) === undefined) {
                    node.type = "NoOp";
                }
                // seed the model with the (possibly auto-laid-out) positions immediately, so an
                // export right after load carries them instead of waiting for a drag (the old 5s
                // position timer used to backfill these)
                const graphNode = modelByUid.get(node.id);
                if (graphNode !== undefined) {
                    graphNode.metadata = {positionX: node.position.x, positionY: node.position.y};
                }
            }

            // "Rendering": mount nodes in frame-budgeted batches so a big graph never blocks the main
            // thread in one reconcile. Handles are registered by reactflow's own ResizeObserver as
            // each node element is observed on mount (see the handlesMeasuredRef note in
            // AuthoringGraphNode), so by the time all batches have settled the handles exist for the
            // edges below.
            //
            // Every node genuinely has to mount once here — that mount is what registers its
            // handles, and an edge whose endpoint has none is dropped — so this pass can't be culled
            // away. What it *can* avoid is mounting each node with its full socket/editor UI: the
            // default viewport sits at zoom 1, which is above LOD_ZOOM_THRESHOLD, so a fresh load
            // used to build the complete detail DOM for every node (sockets, handles, dropdowns,
            // tooltips) only to zoom out and discard it a moment later at fitView. Dropping the
            // viewport below the LOD threshold first makes each of those mounts the flat LOD box,
            // which still carries a handle per socket id. fitView below sets the real viewport.
            reactFlowInstance?.setViewport({ x: 0, y: 0, zoom: LOD_ZOOM_THRESHOLD / 2 });
            setLoadingState({ active: true, step: "Rendering", progress: 0.82 });
            await nextFrame();
            if (cancelled) { return; }
            // Each batch costs a full frame *and* an O(total nodes) reactflow store rebuild, so
            // small batches paid that rebuild dozens of times for no benefit.
            const NODE_BATCH = 1000;
            if (loadedNodes.length === 0) {
                setNodes([]);
            }
            for (let i = 0; i < loadedNodes.length; i += NODE_BATCH) {
                const batch = loadedNodes.slice(i, i + NODE_BATCH);
                if (i === 0) {
                    setNodes(batch);
                } else {
                    setNodes(prev => [...prev, ...batch]);
                }
                const done = Math.min(i + NODE_BATCH, loadedNodes.length) / loadedNodes.length;
                setLoadingState({ active: true, step: "Rendering", progress: 0.82 + done * 0.08 });
                await nextFrame();
                if (cancelled) { return; }
            }

            // "Connecting": let React commit the nodes and reactflow synthesize their custom handles
            // before wiring edges. Replaces the old fixed 1000ms setTimeout (a handle-race hack) with
            // a short rAF settle. Handle registration rides on reactflow's ResizeObserver, whose
            // callback index.tsx defers by one frame, so wait three: commit, observer delivery,
            // and a spare so a commit that slips a frame can't leave edges unattachable.
            setLoadingState({ active: true, step: "Connecting", progress: 0.9 });
            await nextFrame();
            await nextFrame();
            await nextFrame();
            if (cancelled) { return; }
            setEdges(loadedEdges);
            frameGraph();

            // "Resolving types": now that the canvas is on-screen, run the deferred O(n²) type-group
            // fixpoint (mutates the model in place), then recolor the gray value wires to their
            // resolved type colors and bump node data so any detailed (zoomed-in) node repaints.
            setLoadingState({ active: true, step: "Resolving types", progress: 0.95 });
            await nextFrame();
            if (cancelled) { return; }
            propagateGraphGroupTypes(graph.nodes, true);
            const nodeByUid = modelByUid;
            setEdges(eds => eds.map((edge) => {
                const sourceNode = nodeByUid.get(edge.source);
                if (sourceNode === undefined) { return edge; }
                // flow wires already carry the flow color from getAuthorGraph; only value wires were
                // painted gray and need resolving
                if (sourceNode.flows?.output?.[edge.sourceHandle!] !== undefined) { return edge; }
                const stroke = getColorForTypeIndex(resolveOutputSocketType(sourceNode, edge.sourceHandle!, graph.nodes, nodeByUid));
                if ((edge.style as any)?.stroke === stroke) { return edge; }
                return { ...edge, style: { ...(edge.style || {}), stroke, strokeWidth: 2 } };
            }));
            // in-place propagation doesn't change node identity, so force every mounted node to
            // re-read its (now resolved) socket types
            setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data } })));

            // "Checking": the graph is fully built and typed — run the whole-graph live validation
            // (model-driven and chunked; its result is independent of which nodes are mounted or
            // visible), then clear the loading bar. A superseding load cancels the validation run
            // (committed=false) and owns the loading bar itself, so only a committed pass clears it.
            setLoadingState({ active: true, step: "Checking", progress: 0.97 });
            // markApplied: a finished load/rebuild *is* the applied graph, so this result seeds the
            // snapshot the "Loaded with issues" panel reports
            const committed = await runLiveValidation({ markApplied: true });
            if (cancelled || !committed) { return; }
            setLoadingState(null);
        };

        rebuild();
        return () => { cancelled = true; };
    }, [graph, reactFlowInstance]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const active = document.activeElement;
            if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.tagName === 'SELECT') return;
            if (!e.ctrlKey && !e.metaKey) return;
            switch (e.key.toLowerCase()) {
                case 'c': e.preventDefault(); copySelectedNodes(); break;
                case 'v': e.preventDefault(); pasteNodes(); break;
                case 'd': e.preventDefault(); e.stopPropagation(); duplicateSelectedNodes(); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [copySelectedNodes, pasteNodes, duplicateSelectedNodes]);

    // right-clicking the pane (panOnDrag={[2]} reserves the right button for panning; reactflow
    // still fires this once the button is released without having actually panned, which is what
    // we use to distinguish a right-click from a right-drag)
    const handleRightClick = (e: React.MouseEvent) => {
        if (!reactFlowInstance) return;
        // a right-click while a wire is being dragged is the "cancel wiring" gesture (handled in
        // onConnectEnd) — don't also open the Add Node menu
        if (connectStartRef.current !== null) { e.preventDefault(); return; }
        e.preventDefault();
        const bounds = reactFlowRef.current!.getBoundingClientRect();
        const position = reactFlowInstance.project({
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top
        });
        mousePosRef.current = position;
        setAuthoringComponentModal(AuthoringComponentModelType.NODE_PICKER);
    };

    // the menu bar's Add Node entry: same picker as the right-click one, but with no cursor to
    // place the node at, so it lands in the middle of the current view
    const openNodePickerAtCenter = () => {
        if (!reactFlowInstance || !reactFlowRef.current) return;
        const bounds = reactFlowRef.current.getBoundingClientRect();
        mousePosRef.current = reactFlowInstance.project({ x: bounds.width / 2, y: bounds.height / 2 });
        pendingWireRef.current = null;
        setAuthoringComponentModal(AuthoringComponentModelType.NODE_PICKER);
    };

    // open a graph authoring side panel (variables, custom events, JSON view, ...), or close it
    // again when its own menu bar button is clicked a second time
    const togglePanel = (modal: AuthoringComponentModelType) => {
        setAuthoringComponentModal(authoringComponentModal === modal ? AuthoringComponentModelType.NONE : modal);
    };

    const toggleGraphFullscreen = async () => {
        await graphFullscreenState.toggle();
    };

    const handleLeftClick = (e: React.MouseEvent) => {
        e.preventDefault();
       setAuthoringComponentModal(AuthoringComponentModelType.NONE)
    }

    const shouldAllowNativeContextMenu = (target: EventTarget | null): boolean => {
        if (!(target instanceof Element)) { return false; }
        return target.closest(
            'input, textarea, select, option, button, a, [contenteditable=""], [contenteditable="true"], [data-allow-context-menu="true"]'
        ) !== null;
    };

    const suppressBrowserContextMenu = (e: React.MouseEvent) => {
        if (shouldAllowNativeContextMenu(e.target)) { return; }
        e.preventDefault();
    };

    // walk every edge feeding into `nodeId` (flow or value, either counts as "connected"),
    // then repeat from each source found, so the whole upstream hierarchy is collected — not
    // just its direct predecessors. Also collects the edges walked along the way, so the wires
    // connecting that hierarchy can be highlighted too.
    // incoming edges per target, so the walk below visits only a node's own predecessors instead of
    // rescanning every edge in the graph for each node it reaches (O(ancestors x edges) per click)
    const edgesByTarget = React.useMemo(() => {
        const byTarget = new Map<string, Edge[]>();
        for (const edge of edges) {
            const existing = byTarget.get(edge.target);
            if (existing === undefined) { byTarget.set(edge.target, [edge]); } else { existing.push(edge); }
        }
        return byTarget;
    }, [edges]);

    const getAncestors = useCallback((nodeId: string): { nodeIds: Set<string>, edgeIds: Set<string> } => {
        const visitedNodes = new Set<string>();
        const visitedEdges = new Set<string>();
        const stack = [nodeId];
        while (stack.length > 0) {
            const current = stack.pop()!;
            for (const edge of edgesByTarget.get(current) ?? []) {
                visitedEdges.add(edge.id);
                if (!visitedNodes.has(edge.source)) {
                    visitedNodes.add(edge.source);
                    stack.push(edge.source);
                }
            }
        }
        return { nodeIds: visitedNodes, edgeIds: visitedEdges };
    }, [edgesByTarget]);

    // recompute the highlighted ancestor set whenever selection changes; only meaningful for a
    // single selected node, so multi-select or an empty selection clears the highlight
    const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[] }) => {
        const { nodeIds, edgeIds } = selectedNodes.length === 1
            ? getAncestors(selectedNodes[0].id)
            : { nodeIds: new Set<string>(), edgeIds: new Set<string>() };
        setAncestorNodeIds(nodeIds);
        setAncestorEdgeIds(edgeIds);
    }, [getAncestors]);

    // tag ancestor nodes with a highlight class for rendering, without touching the underlying
    // `nodes` state (positions, selection, etc. stay owned by useNodesState/onNodesChange)
    const displayNodes = React.useMemo(() => {
        if (ancestorNodeIds.size === 0) { return nodes; }
        return nodes.map((n) => ancestorNodeIds.has(n.id)
            ? { ...n, className: [n.className, "ancestor-highlight"].filter(Boolean).join(" ") }
            : n);
    }, [nodes, ancestorNodeIds]);

    // thicken the wires connecting the highlighted ancestor hierarchy to the selected node
    const displayEdges = React.useMemo(() => {
        if (ancestorEdgeIds.size === 0) { return edges; }
        return edges.map((e) => ancestorEdgeIds.has(e.id)
            ? { ...e, style: { ...(e.style || {}), strokeWidth: 4 }, zIndex: 1 }
            : e);
    }, [edges, ancestorEdgeIds]);

    return (
        <div className={"panel"}>
            {/* the graph's own toolbar: same height/treatment as the engine panel's toolbar, so
                both halves of the workspace start on the same line */}
            <div className={"panel__toolbar graph-menu-bar"}>
                <MenuBarButton
                    id={"add-node-btn"}
                    icon={<IconAddNode/>}
                    label={"Add Node"}
                    isActive={authoringComponentModal === AuthoringComponentModelType.NODE_PICKER}
                    onClick={openNodePickerAtCenter}
                />
                <MenuBarDivider/>
                <MenuBarButton
                    id={"variables-btn"}
                    icon={<IconVariables/>}
                    label={"Variables"}
                    isActive={authoringComponentModal === AuthoringComponentModelType.VARIABLES}
                    onClick={() => togglePanel(AuthoringComponentModelType.VARIABLES)}
                />
                <MenuBarButton
                    id={"custom-events-btn"}
                    icon={<IconCustomEvents/>}
                    label={"Custom Events"}
                    isActive={authoringComponentModal === AuthoringComponentModelType.CUSTOM_EVENTS}
                    onClick={() => togglePanel(AuthoringComponentModelType.CUSTOM_EVENTS)}
                />
                <MenuBarDivider/>
                <MenuBarButton
                    id={"show-json-btn"}
                    icon={<IconJsonView/>}
                    label={"JSON View"}
                    isActive={authoringComponentModal === AuthoringComponentModelType.JSON_VIEW}
                    onClick={() => togglePanel(AuthoringComponentModelType.JSON_VIEW)}
                />
                <MenuBarButton
                    id={"show-node-list-btn"}
                    icon={<IconNodeTypes/>}
                    label={"Node Types"}
                    isActive={authoringComponentModal === AuthoringComponentModelType.NODE_LIST}
                    onClick={() => togglePanel(AuthoringComponentModelType.NODE_LIST)}
                />
                <span className={"panel__toolbar-spacer"}/>
                {/* view actions live on the right of the bar, ahead of the status indicators */}
                <MenuBarButton
                    id={"search-graph-btn"}
                    icon={<IconSearch/>}
                    label={"Search Graph"}
                    isActive={authoringComponentModal === AuthoringComponentModelType.GRAPH_SEARCH}
                    onClick={() => togglePanel(AuthoringComponentModelType.GRAPH_SEARCH)}
                />
                <ReloadIndicator dirty={graphDirty} onReload={requestPlay}/>
                <DiagnosticsCounter diagnostics={liveDiagnostics} onJumpToNode={jumpToNode}/>
            </div>
            {/* .authoring-view is what the fullscreen toggle expands (see the fullscreen rules in
                flowNodes.css); the fallback class covers browsers without the Fullscreen API */}
            <div
                ref={reactFlowRef}
                className={`panel__body authoring-view${fullscreenFallback ? " authoring-view--fullscreen-fallback" : ""}`}
                data-testid={"authoring-view"}
                onContextMenuCapture={suppressBrowserContextMenu}
                onContextMenu={suppressBrowserContextMenu}
            >
                <ReactFlow
                    id={"flow-container"}
                    nodes={displayNodes}
                    onNodesChange={onNodesChange}
                    edges={displayEdges}
                    onEdgesChange={onEdgesChange}
                    onNodesDelete={onNodesDelete}
                    onInit={setReactFlowInstance}
                    onConnect={onConnect}
                    onConnectStart={onConnectStart}
                    onConnectEnd={onConnectEnd}
                    onEdgesDelete={onEdgesDelete}
                    onNodeDragStop={onNodeDragStop}
                    onSelectionChange={onSelectionChange}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    // Framing a large graph is a zoom-out problem: 5000 nodes on a 500-unit grid
                    // span a couple of hundred thousand units, which needs a zoom around 0.003 to
                    // fit a viewport. The old 0.1 floor made that arithmetically impossible, so
                    // "fit view" clamped and left you parked in the middle of the canvas looking at
                    // the gap between two components — which is what made the Frame button look dead.
                    minZoom={0.001}
                    // Viewport culling: only mount nodes/edges intersecting the viewport (+ overscan)
                    // so frame cost tracks the visible window, not the whole graph. Reactflow culls by
                    // node width/height, so nodes carry explicit dimensions (see .flow-node in flowNodes.css).
                    onlyRenderVisibleElements={true}
                    onPaneClick={handleLeftClick}
                    onPaneContextMenu={handleRightClick}
                    panOnDrag={[2]}
                    selectionOnDrag={true}
                    zoomOnScroll={true}
                    zoomOnDoubleClick={false}
                    preventScrolling={true}
                    deleteKeyCode={['Delete', 'Backspace']}
                    fitView
                    // drops reactflow's "React Flow" watermark from the bottom-right corner; it
                    // otherwise overlaps the minimap. Permitted under reactflow's MIT license.
                    proOptions={{ hideAttribution: true }}
                >
                    {/* zoom / fit, bottom-left (react-flow's default corner). <Controls/> renders
                        its own buttons and then any children, so app-specific toggles are added as
                        <ControlButton/> entries at the end of the same stack. The built-in fit
                        button has to go through frameGraph too — reactflow's own fitView is the one
                        that gives up on unmeasured (culled) nodes. */}
                    {/* no lock button: reactflow's only gates its own drag/select/connect, which
                        leaves this editor's own affordances (right-click add, delete buttons, node
                        inputs, clipboard shortcuts) live — a "locked" graph was still editable */}
                    <Controls showInteractive={false} onFitView={() => frameGraph(300)}>
                        <ControlButton
                            data-testid={"graph-fullscreen-btn"}
                            className={graphFullscreen ? "is-active" : undefined}
                            title={graphFullscreen ? "Exit fullscreen" : "Show the graph fullscreen"}
                            aria-label={"Toggle graph fullscreen"}
                            aria-pressed={graphFullscreen}
                            onClick={() => void toggleGraphFullscreen()}
                        >
                            <IconFullscreen active={graphFullscreen}/>
                        </ControlButton>
                        <ControlButton
                            data-testid={"toggle-input-legend-btn"}
                            className={showInputLegend ? "is-active" : undefined}
                            title={showInputLegend ? "Hide the input legend" : "Show the input legend"}
                            aria-label={"Toggle input legend"}
                            aria-pressed={showInputLegend}
                            onClick={() => setShowInputLegend(show => !show)}
                        >
                            <IconLegend/>
                        </ControlButton>
                    </Controls>
                    <Background />
                    <NodeWarningAnnotations />
                    <GraphMiniMap />

                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.NODE_PICKER}>
                        <NodePickerComponent closeModal={closeNodePicker} onAddNode={handlePickNode} mousePos={mousePosRef.current} constraint={getPendingPickerConstraint()}/>
                    </RenderIf>
                    {socketPicker && (
                        <SocketPickerComponent
                            candidates={getWireSocketCandidates(socketPicker.from, socketPicker.newNodeUid)}
                            pickingInput={socketPicker.from.handleType === "source"}
                            clientX={socketPicker.clientX}
                            clientY={socketPicker.clientY}
                            onSelect={completeWireToSocket}
                            onClose={() => setSocketPicker(null)}
                        />
                    )}
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.GRAPH_SEARCH}>
                        <GraphSearchComponent
                            closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)}
                            onJumpToNode={jumpToNode}
                            onJumpToIndex={jumpToNodeIndex}
                        />
                    </RenderIf>
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.JSON_VIEW}>
                        <JSONViewComponent closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)}/>
                    </RenderIf>
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.NODE_LIST}>
                        <NodeListComponent closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)}/>
                    </RenderIf>
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.CUSTOM_EVENTS}>
                        <CustomEventsComponent closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)}/>
                    </RenderIf>
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.VARIABLES}>
                        <VariablesComponent closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)}/>
                    </RenderIf>

                    {/* react-flow's "center" panel positions via left:50%+translateX(-50%); with an
                        explicit width, percentages resolve against only the space from the 50% mark
                        to the container's right edge (roughly half the real width), so the bar came out
                        mis-sized and off-center. Overriding to a full-width, pointer-events:none wrapper
                        (transform cleared) lets the inner bar center itself normally via margin auto. */}
                    <Panel position={"top-center"} style={{ left: 0, right: 0, transform: 'none', boxSizing: 'border-box', padding: 'var(--sp-3)', pointerEvents: 'none' }}>
                        <div style={{ width: "100%", maxWidth: "44rem", margin: "0 auto", pointerEvents: 'auto' }}>
                            <LoadingProgressBar />
                        </div>
                    </Panel>
                </ReactFlow>
            </div>

            {/* input legend: a real footer bar on the panel rather than a canvas overlay, so it
                never covers nodes and never collides with the minimap. Toggled from the menu bar. */}
            <RenderIf shouldShow={showInputLegend}>
                <div className={"graph-keymap"}>
                    {([
                        ['Right-click', 'Add node'],
                        ['Drop wire on canvas', 'Add & connect node'],
                        ['Right-drag', 'Pan'],
                        ['Left-drag', 'Multi-select'],
                        ['Scroll', 'Zoom'],
                        [isMacPlatform ? '⌘C / ⌘V' : 'Ctrl+C / Ctrl+V', 'Copy / Paste'],
                        [isMacPlatform ? '⌘D' : 'Ctrl+D', 'Duplicate'],
                        [isMacPlatform ? '⌫' : 'Del', 'Delete selected'],
                    ] as [string, string][]).map(([key, label]) => (
                        <span key={key} className={"graph-keymap__item"}>
                            <kbd className={"graph-keymap__key"}>{key}</kbd>
                            <span>{label}</span>
                        </span>
                    ))}
                </div>
            </RenderIf>
        </div>
    )
}

const getNodeCategory = (nodeType: string): string => {
    const slashIndex = nodeType.indexOf("/");
    if (slashIndex === -1) {
        return "Other";
    }
    const category = nodeType.substring(0, slashIndex);
    return category.charAt(0).toUpperCase() + category.slice(1);
}

// spec-driven tooltip/search text for a node type's picker entry: op description plus every
// flow/value socket (value sockets include their description, flow sockets are name-only since
// IInteractivityFlow carries no description field)
const nodePickerSpecByType = interactivityNodeSpecs.reduce((specs, node) => {
    specs[node.op!] = node;
    return specs;
}, {} as {[nodeType: string]: AuthoredNode});

type NodePickerItem =
    | { kind: "node"; key: string; nodeType: string }
    | { kind: "preset"; key: string; nodeType: string; preset: NodePreset };

const nodePickerItemsByCategory = [
    ...Object.keys(nodeTypes).map((nodeType): NodePickerItem => ({
        kind: "node",
        key: `node:${nodeType}`,
        nodeType,
    })),
    ...nodePresets.map((preset): NodePickerItem => ({
        kind: "preset",
        key: `preset:${preset.id}`,
        nodeType: preset.op,
        preset,
    })),
].reduce((categories, item) => {
    const category = getNodeCategory(item.nodeType);
    (categories[category] = categories[category] ?? []).push(item);
    return categories;
}, {} as {[category: string]: NodePickerItem[]});

const sortedNodeCategories = Object.keys(nodePickerItemsByCategory).sort((a, b) => a.localeCompare(b));

const NodePickerTooltipContent = (props: {nodeType: string}) => {
    const spec = nodePickerSpecByType[props.nodeType];
    if (!spec) { return <>{props.nodeType}</>; }
    return <NodeInfoTooltip sections={buildNodeTypeTooltipSections(spec)} />;
};

const getNodePickerSearchText = (nodeType: string): string => {
    const spec = nodePickerSpecByType[nodeType];
    return joinSearchTerms(nodeType, spec?.description, spec?.aliases);
};

const getNodePickerItemSearchText = (item: NodePickerItem): string =>
    item.kind === "preset" ? getNodePresetSearchText(item.preset) : getNodePickerSearchText(item.nodeType);

const getNodePickerItemLabel = (item: NodePickerItem): string =>
    item.kind === "preset" ? item.preset.label : item.nodeType;

// what the Add Node menu must offer to finish a dropped wire, computed from the wire's origin socket:
// a flow wire needs a node with a flow socket in `direction`; a value wire needs a node with a
// type-compatible value socket (from an OUTPUT we need a compatible value INPUT and carry the source's
// resolved `fromType`; from an INPUT we need a compatible value OUTPUT and carry the input's `fromOpts`).
// null means "no pending wire" — no filtering.
type PickerConstraint =
    | { kind: "flow"; direction: "input" | "output" }
    | { kind: "valueInput"; fromType: number | undefined }
    | { kind: "valueOutput"; fromOpts: number[] | undefined }
    | null;

// whether an op can satisfy the pending-wire constraint, so the Add Node menu only lists nodes that can
// actually receive the wire. Dynamic-socket ops generate their sockets at authoring time, so their value
// sockets can't be pre-checked — always offer them. `DynamicFlowOutputs` ops (flow/sequence, flow/multiGate)
// can always gain an output flow even though the spec lists none.
const nodeTypeMatchesConstraint = (nodeType: string, constraint: PickerConstraint): boolean => {
    if (!constraint) { return true; }
    const spec = getNodeSpec(nodeType);
    if (!spec) { return false; }
    if (constraint.kind === "flow") {
        if (constraint.direction === "output" && hasNodeSpecFlag(spec, NodeSpecFlag.DynamicFlowOutputs)) { return true; }
        return Object.keys(spec.flows?.[constraint.direction] ?? {}).length > 0;
    }
    if (hasNodeSpecFlag(spec, NodeSpecFlag.DynamicSockets)) { return true; }
    if (constraint.kind === "valueInput") {
        return Object.values(spec.values?.input ?? {}).some(v =>
            v.typeOptions === undefined || constraint.fromType === undefined || v.typeOptions.includes(constraint.fromType)
        );
    }
    return Object.values(spec.values?.output ?? {}).some(v =>
        constraint.fromOpts === undefined || v.typeOptions === undefined || v.typeOptions.some(t => constraint.fromOpts!.includes(t))
    );
};

// small floating menu shown after a wire is dropped on empty canvas and a node is picked: lets the
// user choose which socket on that new node the wire attaches to. Positioned at the drop point.
const SocketPickerComponent = (props: {
    candidates: WireSocketCandidate[];
    pickingInput: boolean;
    clientX: number;
    clientY: number;
    onSelect: (socket: string) => void;
    onClose: () => void;
}) => {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") { props.onClose(); } };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <div
            className={"nowheel nodrag socket-picker"}
            data-testid={"socket-picker"}
            style={{
                position: "fixed",
                // keep the menu on-screen when dropped near the right/bottom edge
                left: Math.min(props.clientX, window.innerWidth - 380),
                top: Math.min(props.clientY, window.innerHeight - 540),
                zIndex: 1000, background: "var(--surface-0)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-lg)", minWidth: "21rem", maxHeight: "min(32rem, 70vh)",
                overflowY: "auto", overscrollBehavior: "contain", textAlign: "left",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--sp-3) var(--sp-4)", fontWeight: 700, fontSize: "var(--fs-lg)", borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                <span>{props.pickingInput ? "Connect to input" : "Connect to output"}</span>
                <span role="button" onClick={props.onClose} style={{ cursor: "pointer", color: "#999", paddingLeft: 12, fontSize: 22, lineHeight: 1 }} title={"Cancel"}>×</span>
            </div>
            {props.candidates.length === 0 ? (
                <div style={{ padding: "16px 18px", fontSize: 15, color: "#888" }}>No compatible sockets</div>
            ) : (
                props.candidates.map(c => (
                    <div
                        key={c.socket}
                        className={"socket-picker-item"}
                        data-testid={`socket-picker-item-${c.socket}`}
                        onClick={() => props.onSelect(c.socket)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", cursor: "pointer", fontSize: 16 }}
                    >
                        <span style={{ width: 14, height: 14, borderRadius: "50%", background: c.color, flexShrink: 0, boxShadow: "0 0 0 1px rgba(0,0,0,0.25)" }} />
                        <span style={{ overflowWrap: "anywhere" }}>{c.label}</span>
                    </div>
                ))
            )}
        </div>
    );
};

const NodePickerComponent = (props: {onAddNode: any, closeModal: any, mousePos: any, constraint?: PickerConstraint}) => {
    const [filter, setFilter] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const nodeListRef = useRef<HTMLDivElement | null>(null);

    const onNodeListWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const el = nodeListRef.current;
        if (!el) { return; }
        // node list uses CSS columns, so overflow is horizontal even though scrolling comes from a vertical wheel
        el.scrollLeft += e.deltaY;
        e.preventDefault();
    };

    const selectNode = (item: NodePickerItem) => {
        props.onAddNode(item.kind === "preset" ? item.preset : item.nodeType, {x: props.mousePos.x, y: props.mousePos.y});
        props.closeModal()
    }

    const toggleCategory = (category: string) => {
        setActiveCategory(activeCategory === category ? null : category);
    }

    const normalizedFilter = filter.trim().toLowerCase();

    return (
        <GraphOverlayPanel id={"node-picker-panel"} title={"Add Node"} maxWidth={"52rem"} onClose={props.closeModal}>
            <>
                <Form.Control
                    data-testid={"node-picker-search"}
                    type="text"
                    autoFocus={true}
                    onChange={(e) => setFilter(e.target.value)}
                    value={filter}
                    placeholder="Search nodes..."
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-1)", marginTop: "var(--sp-3)" }}>
                    {
                        sortedNodeCategories.map(category => {
                            const categoryColor = getNodeCategoryColor(category);
                            const isActive = activeCategory === category;
                            return (
                                <Button
                                    key={category}
                                    size={"sm"}
                                    variant={"outline-secondary"}
                                    onClick={() => toggleCategory(category)}
                                    data-testid={`node-picker-category-${category}`}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 6,
                                        borderColor: isActive ? categoryColor : undefined,
                                        background: isActive ? `${categoryColor}33` : undefined,
                                        color: "#333",
                                    }}
                                >
                                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: categoryColor, display: "inline-block", flexShrink: 0 }} />
                                    {category}
                                </Button>
                            );
                        })
                    }
                </div>
                <div ref={nodeListRef} className="nowheel" onWheel={onNodeListWheel} style={{ columnWidth: "12.5rem", columnGap: "1.5rem", maxHeight: "min(22rem, 38vh)", overflowX: "auto", overflowY: "auto", overscrollBehavior: "contain", marginTop: "var(--sp-4)" }}>
                    {
                        sortedNodeCategories.map(category => {
                            const itemsInCategory = nodePickerItemsByCategory[category].filter(item =>
                                (normalizedFilter === "" || getNodePickerItemSearchText(item).includes(normalizedFilter)) &&
                                nodeTypeMatchesConstraint(item.nodeType, props.constraint ?? null)
                            );
                            const shouldShowCategory = itemsInCategory.length > 0 && (activeCategory === null || activeCategory === category);
                            return (
                                <RenderIf key={category} shouldShow={shouldShowCategory}>
                                    <div style={{ breakInside: "avoid", marginBottom: 16 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "bold", color: "#555", borderBottom: `3px solid ${getNodeCategoryColor(category)}`, paddingBottom: 4, marginBottom: 8 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: getNodeCategoryColor(category), display: "inline-block", flexShrink: 0 }} />
                                            {category}
                                        </div>
                                        {
                                            itemsInCategory.map(item => (
                                                <OverlayTrigger
                                                    key={item.key}
                                                    placement={"right"}
                                                    delay={{show: 300, hide: 0}}
                                                    overlay={
                                                        <Tooltip id={`node-picker-tooltip-${item.key}`} className="node-info-tooltip">
                                                            {item.kind === "preset" && item.preset.description ? (
                                                                <>
                                                                    <strong>{item.preset.label}</strong>
                                                                    <div>{item.preset.description}</div>
                                                                    <div style={{ marginTop: 4, fontFamily: "monospace" }}>{item.preset.op}</div>
                                                                </>
                                                            ) : (
                                                                <NodePickerTooltipContent nodeType={item.nodeType} />
                                                            )}
                                                        </Tooltip>
                                                    }
                                                >
                                                    <p className="node-picker-item" style={{overflowWrap: "anywhere"}} onClick={() => selectNode(item)} data-testid={item.kind === "preset" ? `node-picker-preset-${item.preset.id}` : `node-picker-${item.nodeType}`}>
                                                        {getNodePickerItemLabel(item)}
                                                        {item.kind === "preset" && (
                                                            <span style={{ display: "block", fontSize: 11, color: "#666", fontFamily: "monospace" }}>{item.preset.op}</span>
                                                        )}
                                                    </p>
                                                </OverlayTrigger>
                                            ))
                                        }
                                    </div>
                                </RenderIf>
                            )
                        })
                    }
                </div>
            </>
        </GraphOverlayPanel>
    );
}

const JsonTreeNode = (props: {value: any, name?: string, defaultCollapsed?: boolean, isLast?: boolean}) => {
    const {value, name, isLast} = props;
    const isObject = value !== null && typeof value === "object";
    const [collapsed, setCollapsed] = useState(props.defaultCollapsed ?? false);

    const keyLabel = name !== undefined
        ? <span style={{color: "#a626a4"}}>{`"${name}"`}: </span>
        : null;

    if (!isObject) {
        let display: string;
        let color: string;
        if (typeof value === "string") { display = `"${value}"`; color = "#50a14f"; }
        else if (typeof value === "number") { display = String(value); color = "#986801"; }
        else if (typeof value === "boolean") { display = String(value); color = "#0184bc"; }
        else { display = "null"; color = "#a0a1a7"; }
        return (
            <div style={{whiteSpace: "pre"}}>
                {keyLabel}<span style={{color}}>{display}</span>{isLast ? "" : ","}
            </div>
        );
    }

    const isArray = Array.isArray(value);
    const entries: [string, any][] = isArray
        ? (value as any[]).map((v, i) => [String(i), v])
        : Object.entries(value);
    const open = isArray ? "[" : "{";
    const close = isArray ? "]" : "}";

    if (entries.length === 0) {
        return (
            <div style={{whiteSpace: "pre"}}>
                {keyLabel}<span>{open}{close}</span>{isLast ? "" : ","}
            </div>
        );
    }

    return (
        <div style={{whiteSpace: "pre"}}>
            <div style={{cursor: "pointer"}} onClick={() => setCollapsed(!collapsed)}>
                <span style={{display: "inline-block", width: 14, color: "#a0a1a7"}}>{collapsed ? "▶" : "▼"}</span>
                {keyLabel}<span>{open}</span>
                {collapsed && <span style={{color: "#a0a1a7"}}>{isArray ? ` ${entries.length} items ` : ` … `}{close}{isLast ? "" : ","}</span>}
            </div>
            {!collapsed && (
                <>
                    <div style={{paddingLeft: 18}}>
                        {entries.map(([k, v], i) => (
                            <JsonTreeNode
                                key={k}
                                name={isArray ? undefined : k}
                                value={v}
                                isLast={i === entries.length - 1}
                            />
                        ))}
                    </div>
                    <div style={{whiteSpace: "pre"}}>
                        <span style={{display: "inline-block", width: 14}} />
                        <span>{close}</span>{isLast ? "" : ","}
                    </div>
                </>
            )}
        </div>
    );
}

const JSONViewComponent = (props: {closeModal: any}) => {
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // only shown once reading the clipboard has actually failed (Firefox exposes no readText to
    // pages, any browser can deny the permission, and a non-secure context has no navigator.clipboard
    // at all) — the user pastes the graph JSON in by hand instead
    const [showPasteFallback, setShowPasteFallback] = useState(false);
    const pasteRef = useRef<HTMLTextAreaElement>(null);
    const {getExecutableGraph, loadGraphFromJson, markGraphDirty} = useContext(InteractivityGraphContext);
    const graph = getExecutableGraph();
    const copyToClipboard = async () => {
        const jsonString = JSON.stringify(getExecutableGraph(), undefined, '\t');
        await navigator.clipboard.writeText(jsonString);

        setCopied(true)
        setTimeout(() => {
            setCopied(false);
        }, 2000); // Reset the copied state after 2 seconds
    };

    // parse + load; closes the panel on success, otherwise leaves it open showing what went wrong.
    // loadGraphFromJson is async, so it has to be awaited inside the try for a rejection (malformed
    // or incomplete graph structure) to land in the catch alongside JSON.parse's syntax errors.
    const loadGraphText = async (text: string) => {
        if (text.trim() === "") {return}

        try {
            await loadGraphFromJson(JSON.parse(text));
            markGraphDirty();
        } catch (e) {
            setError(`Could not load graph: ${e instanceof Error ? e.message : String(e)}`);
            return;
        }
        setError(null);
        props.closeModal();
    };

    const pasteFromClipboard = async () => {
        let text: string;
        try {
            text = await navigator.clipboard.readText();
        } catch {
            setShowPasteFallback(true);
            setError("Couldn't read the clipboard. Paste the graph JSON into the box below instead.");
            return;
        }
        await loadGraphText(text);
    };

    return (
        <GraphOverlayPanel
            id={"show-json-view-panel"}
            title={"JSON View"}
            maxWidth={"62rem"}
            onClose={props.closeModal}
            footer={
                <>
                    <Button variant={"outline-primary"} onClick={copyToClipboard}>
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </Button>
                    <Button
                        variant={"outline-primary"}
                        id={"paste-graph-btn"}
                        title={"Replace the current graph with JSON from your clipboard"}
                        onClick={pasteFromClipboard}
                    >
                        Paste from Clipboard
                    </Button>
                </>
            }
        >
            <>
                <div style={{
                    textAlign: "left",
                    overflow: "auto",
                    overscrollBehavior: "contain",
                    height: "min(24rem, 42vh)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--sp-2)",
                    background: "var(--surface-1)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--fs-sm)",
                }}>
                    <JsonTreeNode value={graph} isLast={true} />
                </div>
                {showPasteFallback &&
                    <Form.Group style={{ marginTop: "var(--sp-3)" }}>
                        <Form.Label>Graph JSON</Form.Label>
                        <Form.Control ref={pasteRef} as="textarea" rows={6}/>
                        <Button
                            variant={"outline-primary"}
                            id={"load-graph-btn"}
                            style={{ marginTop: "var(--sp-2)" }}
                            onClick={() => loadGraphText(pasteRef.current?.value ?? "")}
                        >
                            Load
                        </Button>
                    </Form.Group>
                }
                {error !== null &&
                    <div style={{ marginTop: "var(--sp-2)", color: "var(--danger-600)", fontSize: "var(--fs-sm)", whiteSpace: "pre-wrap" }}>{error}</div>
                }
            </>
        </GraphOverlayPanel>
    )
}


const NodeListComponent = (props: {closeModal: any}) => {
    const [copied, setCopied] = useState(false);
    const {getExecutableGraph} = useContext(InteractivityGraphContext);
    const getData = () => {
        const graph = getExecutableGraph();
        const declarations = graph.declarations;
        return declarations.map((x: { op: any; }) => x.op);
    }

    const getDataString = () => {
        const data = getData();
        if (Array.isArray(data)) return "\"" + data.join('", "') + "\"";
        else return JSON.stringify(data);
    }

    const copyToClipboard = async () => {
        const jsonString = getDataString();
        await navigator.clipboard.writeText(jsonString);

        setCopied(true)
        setTimeout(() => {
            setCopied(false);
        }, 2000); // Reset the copied state after 2 seconds
    };

    return (
        <GraphOverlayPanel
            id={"node-list-panel"}
            title={"Node Types"}
            maxWidth={"34rem"}
            onClose={props.closeModal}
            footer={
                <Button variant={"outline-primary"} onClick={copyToClipboard}>
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                </Button>
            }
        >
            <pre style={{
                margin: 0,
                textAlign: "left",
                overflow: "auto",
                overscrollBehavior: "contain",
                height: "min(22rem, 38vh)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--sp-2)",
                background: "var(--surface-1)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--fs-sm)",
                whiteSpace: "pre-wrap",
            }}>{getDataString()}</pre>
        </GraphOverlayPanel>
    )
}

const getNodeConfigStringValues = (node: AuthoredNode): string[] => {
    const strings: string[] = [];
    for (const [key, entry] of Object.entries(node.configuration ?? {})) {
        for (const value of [...(entry.value ?? []), ...(entry.defaultValue ?? [])]) {
            if (typeof value === "string" && value.trim() !== "") {
                strings.push(`${key}: ${value}`);
            }
        }
    }
    return strings;
};

const GraphSearchComponent = (props: {
    closeModal: any,
    onJumpToNode: (nodeUid: string) => void,
    onJumpToIndex: (nodeIndex: number) => boolean,
}) => {
    const {graph} = useContext(InteractivityGraphContext);
    const [query, setQuery] = useState("");
    const [indexInput, setIndexInput] = useState("");
    const [indexError, setIndexError] = useState<string | null>(null);

    const trimmedQuery = query.trim().toLowerCase();

    const results = useMemo(() => {
        if (trimmedQuery === "") { return []; }
        const hits: Array<{ node: AuthoredNode; index: number; configStrings: string[] }> = [];
        for (let index = 0; index < graph.nodes.length; index++) {
            const node = graph.nodes[index];
            const configStrings = getNodeConfigStringValues(node);
            const haystack = `${node.op ?? ""} ${configStrings.join(" ")}`.toLowerCase();
            if (haystack.includes(trimmedQuery)) {
                hits.push({ node, index, configStrings });
            }
        }
        return hits;
    }, [graph.nodes, trimmedQuery]);

    const doIndexJump = () => {
        const parsed = Number.parseInt(indexInput.trim(), 10);
        if (!Number.isInteger(parsed) || !props.onJumpToIndex(parsed)) {
            setIndexError(`Node index "${indexInput}" was not found.`);
            return;
        }
        setIndexError(null);
        props.closeModal();
    };

    return (
        <GraphOverlayPanel id={"graph-search-panel"} title={"Search Graph"} maxWidth={"45rem"} onClose={props.closeModal}>
            <>
                <div style={{display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end"}}>
                    <Form.Group style={{marginBottom: 0}}>
                        <Form.Label style={{fontSize: 12, color: "#666", marginBottom: 4}}>Find by Op or config string value</Form.Label>
                        <Form.Control
                            autoFocus={true}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={"Examples: math/matMul, pointer/set, /nodes/[index]/translation"}
                        />
                    </Form.Group>
                    <div style={{fontSize: 12, color: "#666", marginBottom: 8}}>{trimmedQuery === "" ? "" : `${results.length} result(s)`}</div>
                </div>

                <div style={{display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 10}}>
                    <Form.Control
                        value={indexInput}
                        onChange={(e) => setIndexInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doIndexJump(); } }}
                        placeholder={"Jump directly to Node Index (e.g. 42)"}
                    />
                    <Button variant={"outline-primary"} onClick={doIndexJump}>Go</Button>
                </div>
                {indexError !== null && <div style={{marginTop: 6, color: "#b00020", fontSize: 12}}>{indexError}</div>}

                {trimmedQuery !== "" && (
                    <div style={{marginTop: 12, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", maxHeight: "min(22rem, 38vh)", overflowY: "auto", overscrollBehavior: "contain", textAlign: "left", padding: 8}}>
                        {results.length === 0 && (
                            <div style={{fontSize: 13, color: "#777", padding: "8px 6px"}}>No matching nodes.</div>
                        )}
                        {results.map(({node, index, configStrings}) => (
                            <button
                                key={`${node.uid ?? index}`}
                                className="graph-search-result"
                                onClick={() => {
                                    if (node.uid !== undefined) {
                                        props.onJumpToNode(node.uid);
                                    } else {
                                        props.onJumpToIndex(index);
                                    }
                                    props.closeModal();
                                }}
                            >
                                <div className="graph-search-result-title">#{index} {node.op ?? "Unknown op"}</div>
                                {configStrings.length > 0 && (
                                    <div className="graph-search-result-config" title={configStrings.join("\n")}>
                                        {configStrings.join("  |  ")}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </>
        </GraphOverlayPanel>
    );
};

// shared between the Variables and Custom Events editors' type dropdowns
const typeSignatureName = (type: any): string => {
    if (type.signature === "custom" && type.extensions) {
        return Object.keys(type.extensions)[0];
    }
    return type.signature;
};

// local, editing-friendly shape for a graph variable: kept as an ordered list (rather than
// mutating the graph directly per keystroke) so a variable's id can be renamed a character at a
// time without disturbing the rest of the list.
interface EditableVariable {
    name: string;
    type: number;
    value: any;
}

const fromGraphVariables = (variables: IInteractivityVariable[]): EditableVariable[] =>
    // loaded KHR_interactivity graphs carry the name in `id`, authored ones in `name`
    (variables || []).map((variable) => ({ name: variable.name ?? (variable as any).id ?? "", type: variable.type, value: variable.value }));

const toGraphVariables = (variables: EditableVariable[]): IInteractivityVariable[] =>
    variables.map(({ name, type, value }) => {
        const entry: IInteractivityVariable = { type };
        if (name !== "") { entry.name = name; }
        if (value !== undefined) { entry.value = value; }
        return entry;
    });

const VariablesComponent = (props: {closeModal: any}) => {
    const {graph, setVariables: setGraphVariables} = useContext(InteractivityGraphContext);
    // seed the editor from the current graph once; from here on the editor owns the state and
    // pushes each change straight back to the graph so the rest of the app stays in sync
    const [variables, setVariables] = useState<EditableVariable[]>(() => fromGraphVariables(graph.variables));
    // a new load replaces `graph`'s identity (interactive edits mutate it in place - see
    // InteractivityGraphContext), so this only re-seeds the editor when a different glTF is loaded
    // while the panel is left open, not on every keystroke
    const loadedGraphRef = useRef(graph);
    useEffect(() => {
        if (graph === loadedGraphRef.current) { return; }
        loadedGraphRef.current = graph;
        setVariables(fromGraphVariables(graph.variables));
    }, [graph]);

    // single choke point for mutations: update local state and commit the projected list to the graph
    const commit = (next: EditableVariable[]) => {
        setVariables(next);
        setGraphVariables(toGraphVariables(next));
    };

    const addVariable = () => {
        // suggest a unique-ish default id so a fresh variable is valid immediately
        const existing = new Set(variables.map((v) => v.name));
        let n = variables.length + 1;
        let name = `variable_${n}`;
        while (existing.has(name)) { name = `variable_${++n}`; }
        commit([...variables, { name, type: 0, value: undefined }]);
    };

    const updateVariable = (index: number, patch: Partial<EditableVariable>) => {
        commit(variables.map((v, i) => (i === index ? { ...v, ...patch } : v)));
    };

    const removeVariable = (index: number) => {
        commit(variables.filter((_, i) => i !== index));
    };

    // maxWidth "none", unlike the other overlays: variable rows carry four controls each, so this
    // one takes the graph panel's full width instead of sitting in a centred column of empty space
    return (
        <GraphOverlayPanel id={"variables-panel"} title={"Variables"} maxWidth={"none"} onClose={props.closeModal}>
                <div className={"graph-overlay-columns graph-overlay-columns--wide-main"}>
                    {/* left: editable list of variables */}
                    <div className={"graph-overlay-columns__main"}>
                        {/* overflowX hidden avoids the horizontal scrollbar Bootstrap's negative
                            row gutters would otherwise trigger (overflow-y:auto forces x to auto too) */}
                        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain", textAlign: "left", paddingRight: 4 }}>
                            {variables.length === 0 && (
                                <p style={{ color: "#888", textAlign: "center", marginTop: 32 }}>
                                    No variables yet. Add one to get started.
                                </p>
                            )}
                            {variables.length > 0 && (
                                <Row style={{ marginBottom: 0, marginLeft: 0, marginRight: 0 }}>
                                    <Col style={{ flexGrow: 2 }}><span style={{ fontSize: 11, color: "#999" }}>ID</span></Col>
                                    <Col xs={2}><span style={{ fontSize: 11, color: "#999" }}>Type</span></Col>
                                    <Col xs={5}><span style={{ fontSize: 11, color: "#999" }}>Value</span></Col>
                                    <Col style={{ width: 44, flexShrink: 0, padding: 0 }}></Col>
                                </Row>
                            )}
                            {variables.map((variable, index) => (
                                <div key={index}>
                                    {index > 0 && <hr style={{ margin: "6px 0", borderColor: "#bbb" }} />}
                                    <Row className={"align-items-center"} style={{ marginTop: 6, marginLeft: 0, marginRight: 0 }}>
                                        {/* flexGrow 2 lets the ID field claim ~2/3 of the leftover
                                            space (the delete column keeps the default 1) so names
                                            have more room while the ✕ stays pinned to the right */}
                                        <Col style={{ flexGrow: 2 }}>
                                            <Form.Control
                                                size={"sm"}
                                                type="text"
                                                value={variable.name}
                                                placeholder="variable id"
                                                onChange={(e) => updateVariable(index, { name: e.target.value })}
                                            />
                                        </Col>
                                        <Col xs={2}>
                                            <Form.Control
                                                as="select"
                                                size={"sm"}
                                                value={variable.type}
                                                onChange={(e) => updateVariable(index, { type: Number(e.target.value), value: undefined })}
                                            >
                                                {standardTypes.map((option, typeIndex) => (
                                                    <option key={typeIndex} value={typeIndex}>{typeSignatureName(option)}</option>
                                                ))}
                                            </Form.Control>
                                        </Col>
                                        {/* widest of the three: a vector/matrix type renders one
                                            number input per component in here */}
                                        <Col xs={5}>
                                            <TypedValueInput
                                                typeIndex={variable.type}
                                                value={variable.value}
                                                onChange={(v) => updateVariable(index, { value: v })}
                                            />
                                        </Col>
                                        <Col style={{ width: 44, flexShrink: 0, padding: "0 4px", textAlign: "right" }}>
                                            <Button variant="outline-secondary" size={"sm"} title={"Remove variable"} onClick={() => removeVariable(index)}>
                                                ✕
                                            </Button>
                                        </Col>
                                    </Row>
                                </div>
                            ))}
                        </div>
                        <hr style={{ borderTop: '1px solid #ddd', margin: '8px 0' }} />
                        <Button variant={"outline-primary"} id={"add-variable-btn"} onClick={addVariable}>
                            + Add Variable
                        </Button>
                    </div>

                    {/* right: live JSON view (fixed width, see .graph-overlay-columns__json) */}
                    <div className={"graph-overlay-columns__json"}>
                        <span className={"graph-overlay-columns__json-label"}>JSON</span>
                        <pre>{JSON.stringify(toGraphVariables(variables), undefined, 2)}</pre>
                    </div>
                </div>
        </GraphOverlayPanel>
    )
}

// local, editing-friendly shape for a custom event: value ids are kept as an ordered list of
// {key, type, defaultValue} entries (rather than a Record) so a value id can be renamed a
// character at a time without keys colliding or vanishing mid-edit.
interface EditableEventValue {
    key: string;
    type: number;
    defaultValue: any;
}
interface EditableEvent {
    id: string;
    values: EditableEventValue[];
}

const fromGraphEvents = (events: IInteractivityEvent[]): EditableEvent[] =>
    (events || []).map((event) => ({
        id: event.id,
        values: Object.entries(event.values || {}).map(([key, value]) => ({
            key,
            type: value.type,
            defaultValue: value.value,
        })),
    }));

// project the editing model back onto the graph's IInteractivityEvent[] shape, dropping any
// value rows whose id is still blank so the committed graph never carries an empty-string key
const toGraphEvents = (events: EditableEvent[]): IInteractivityEvent[] =>
    events.map((event) => ({
        id: event.id,
        values: event.values.reduce((acc, { key, type, defaultValue }) => {
            if (key === "") return acc;
            const entry: { type: number; value?: any } = { type };
            if (defaultValue !== undefined) { entry.value = defaultValue; }
            acc[key] = entry;
            return acc;
        }, {} as Record<string, { type: number; value?: any }>),
    }));

const CustomEventsComponent = (props: {closeModal: any}) => {
    const {graph, setEvents: setGraphEvents} = useContext(InteractivityGraphContext);
    // seed the editor from the current graph once; from here on the editor owns the state and
    // pushes each change straight back to the graph so the rest of the app stays in sync
    const [events, setEvents] = useState<EditableEvent[]>(() => fromGraphEvents(graph.events));
    // a new load replaces `graph`'s identity (interactive edits mutate it in place - see
    // InteractivityGraphContext), so this only re-seeds the editor when a different glTF is loaded
    // while the panel is left open, not on every keystroke
    const loadedGraphRef = useRef(graph);
    useEffect(() => {
        if (graph === loadedGraphRef.current) { return; }
        loadedGraphRef.current = graph;
        setEvents(fromGraphEvents(graph.events));
    }, [graph]);

    // single choke point for mutations: update local state and commit the projected list to the graph
    const commit = (next: EditableEvent[]) => {
        setEvents(next);
        setGraphEvents(toGraphEvents(next));
    };

    const updateEventId = (index: number, id: string) => {
        commit(events.map((event, i) => (i === index ? { ...event, id } : event)));
    };

    const addEvent = () => {
        // suggest a unique-ish default id so a fresh event is valid immediately
        const existing = new Set(events.map((e) => e.id));
        let n = events.length + 1;
        let id = `event_${n}`;
        while (existing.has(id)) { id = `event_${++n}`; }
        commit([...events, { id, values: [] }]);
    };

    const deleteEvent = (index: number) => {
        commit(events.filter((_, i) => i !== index));
    };

    const addValue = (eventIndex: number) => {
        commit(events.map((event, i) => (
            i === eventIndex ? { ...event, values: [...event.values, { key: "", type: 0, defaultValue: undefined }] } : event
        )));
    };

    const updateValue = (eventIndex: number, valueIndex: number, patch: Partial<EditableEventValue>) => {
        commit(events.map((event, i) => (
            i === eventIndex
                ? { ...event, values: event.values.map((v, j) => (j === valueIndex ? { ...v, ...patch } : v)) }
                : event
        )));
    };

    const removeValue = (eventIndex: number, valueIndex: number) => {
        commit(events.map((event, i) => (
            i === eventIndex ? { ...event, values: event.values.filter((_, j) => j !== valueIndex) } : event
        )));
    };

    return (
        <GraphOverlayPanel id={"custom-events-panel"} title={"Custom Events"} maxWidth={"69rem"} onClose={props.closeModal}>
                <div className={"graph-overlay-columns"}>
                    {/* left: editable list of events */}
                    <div className={"graph-overlay-columns__main"}>
                        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", textAlign: "left", paddingRight: 4 }}>
                            {events.length === 0 && (
                                <p style={{ color: "#888", textAlign: "center", marginTop: 32 }}>
                                    No custom events yet. Add one to get started.
                                </p>
                            )}
                            {events.map((event, eventIndex) => (
                                <div key={eventIndex} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12, background: "#fafafa" }}>
                                    {/* event header: label+input flex-end so Delete sits at input baseline */}
                                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>Event ID</div>
                                            <Form.Control
                                                type="text"
                                                value={event.id}
                                                placeholder="event id"
                                                onChange={(e) => updateEventId(eventIndex, e.target.value)}
                                            />
                                        </div>
                                        <Button variant="outline-danger" size={"sm"} title={"Delete event"} onClick={() => deleteEvent(eventIndex)}>
                                            Delete
                                        </Button>
                                    </div>
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Values</div>
                                        {event.values.length > 0 && (
                                            <Row style={{ marginBottom: 0 }}>
                                                <Col><span style={{ fontSize: 11, color: "#999" }}>ID</span></Col>
                                                <Col xs={3}><span style={{ fontSize: 11, color: "#999" }}>Type</span></Col>
                                                <Col xs={5}><span style={{ fontSize: 11, color: "#999" }}>Default</span></Col>
                                                {/* xs="auto" so the remove-button column doesn't flex-grow and steal width from Default */}
                                                <Col xs={"auto"} style={{ width: 44, padding: 0 }}></Col>
                                            </Row>
                                        )}
                                        {event.values.map((val, valueIndex) => (
                                            <div key={valueIndex}>
                                                {valueIndex > 0 && <hr style={{ margin: "6px 0", borderColor: "#bbb" }} />}
                                                <Row className={"align-items-center"} style={{ marginTop: 6 }}>
                                                    <Col>
                                                        <Form.Control
                                                            size={"sm"}
                                                            type="text"
                                                            value={val.key}
                                                            placeholder="value id"
                                                            onChange={(e) => updateValue(eventIndex, valueIndex, { key: e.target.value })}
                                                        />
                                                    </Col>
                                                    <Col xs={3}>
                                                        <Form.Control
                                                            as="select"
                                                            size={"sm"}
                                                            value={val.type}
                                                            onChange={(e) => updateValue(eventIndex, valueIndex, { type: Number(e.target.value), defaultValue: undefined })}
                                                        >
                                                            {standardTypes.map((option, typeIndex) => (
                                                                <option key={typeIndex} value={typeIndex}>{typeSignatureName(option)}</option>
                                                            ))}
                                                        </Form.Control>
                                                    </Col>
                                                    <Col xs={5}>
                                                        <TypedValueInput
                                                            typeIndex={val.type}
                                                            value={val.defaultValue}
                                                            onChange={(v) => updateValue(eventIndex, valueIndex, { defaultValue: v })}
                                                        />
                                                    </Col>
                                                    <Col xs={"auto"} style={{ width: 44, padding: "0 4px", textAlign: "right" }}>
                                                        <Button variant="outline-secondary" size={"sm"} title={"Remove value"} onClick={() => removeValue(eventIndex, valueIndex)}>
                                                            ✕
                                                        </Button>
                                                    </Col>
                                                </Row>
                                            </div>
                                        ))}
                                        <Button variant="link" size={"sm"} style={{ padding: "4px 0", textDecoration: "none" }} onClick={() => addValue(eventIndex)}>
                                            + Add value
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <hr style={{ borderTop: '1px solid #ddd', margin: '8px 0' }} />
                        <Button variant={"outline-primary"} id={"add-custom-event-btn"} onClick={addEvent}>
                            + Add Custom Event
                        </Button>
                    </div>

                    {/* right: live JSON view (fixed width, see .graph-overlay-columns__json) */}
                    <div className={"graph-overlay-columns__json"}>
                        <span className={"graph-overlay-columns__json-label"}>JSON</span>
                        <pre>{JSON.stringify(toGraphEvents(events), undefined, 2)}</pre>
                    </div>
                </div>
        </GraphOverlayPanel>
    )
}

