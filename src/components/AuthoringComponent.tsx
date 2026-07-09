import ReactFlow, {
    addEdge, Background,
    Connection, Controls,
    Edge,
    Node,
    NodeChange,
    EdgeTypes,
    NodeTypes, Panel, useEdgesState, useNodesState, useReactFlow, XYPosition
} from 'reactflow';
import {AuthoringGraphNode} from "../authoring/AuthoringGraphNode";
import {DeletableEdge} from "../authoring/DeletableEdge";
import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {v4 as uuidv4} from "uuid";
import {RenderIf} from "./RenderIf";
import {Button, Col, Container, Row, Form, OverlayTrigger, Popover, Tooltip} from "react-bootstrap";
import 'reactflow/dist/style.css';
import {hasNodeSpecFlag, interactivityNodeSpecs, propagateNodeGroupTypes, resolveOutputSocketType, standardTypes, toInteractivityDeclaration} from "../authoring/spec/nodes";
import { IInteractivityEvent, IInteractivityVariable } from '../BasicBehaveEngine/types/InteractivityGraph';
import { AuthoredGraph, AuthoredNode, AuthoredValue, NodeSpecFlag } from '../authoring/spec/AuthoredGraph';
import { InteractivityGraphContext, initialGraph } from '../InteractivityGraphContext';
import { IGraphDiagnostic } from '../diagnostics';
import { categoryLabel } from './DiagnosticsPanel';
import { FLOW_COLOR, getColorForTypeIndex, getNodeCategoryColor } from '../authoring/socketColors';
import { TypedValueInput } from '../authoring/TypedValueInput';
import { NodeInfoTooltip, buildNodeTypeTooltipSections } from '../authoring/NodeInfoTooltip';
import '../css/flowNodes.css';

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


enum AuthoringComponentModelType {
    NODE_PICKER,
    GRAPH_SEARCH,
    JSON_VIEW,
    NODE_LIST,
    UPLOAD_GRAPH,
    CUSTOM_EVENTS,
    VARIABLES,
    NONE
}

// small stroke-style icons for the top menu bar (kept inline to avoid pulling in an icon library
// for five glyphs); viewBox/props mirror the Feather icon set for a consistent stroke weight
const iconProps = {
    width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};

const IconVariables = () => (
    <svg {...iconProps}>
        <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
        <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
        <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
);

const IconCustomEvents = () => (
    <svg {...iconProps}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
);

const IconJsonView = () => (
    <svg {...iconProps}>
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
);

const IconNodeTypes = () => (
    <svg {...iconProps}>
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
);

const IconUpload = () => (
    <svg {...iconProps}>
        <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
);

const IconSearch = () => (
    <svg {...iconProps}>
        <circle cx="11" cy="11" r="7"/>
        <line x1="20" y1="20" x2="16.6" y2="16.6"/>
    </svg>
);

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

const IconReload = () => (
    <svg {...iconProps}>
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
);

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
            title={"The running scene doesn't update automatically as you edit — reload to apply your changes"}
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

const isOverScrollableElement = (target: Element | null, boundary: Element | null): boolean => {
    let el = target;
    while (el && el !== boundary) {
        const { overflowY, overflowX } = window.getComputedStyle(el);
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return true;
        if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) return true;
        el = el.parentElement;
    }
    return false;
};

export const AuthoringComponent = () => {
    const reactFlowRef = useRef<HTMLDivElement | null>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [authoringComponentModal, setAuthoringComponentModal] = useState<AuthoringComponentModelType>(AuthoringComponentModelType.NONE)

    // to handle nodes and edges in graph
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    // uids of every node that feeds (directly or transitively, via flow or value wiring) into the
    // single currently-selected node, so its full upstream hierarchy can be highlighted
    const [ancestorNodeIds, setAncestorNodeIds] = useState<Set<string>>(new Set());
    // ids of the edges connecting that upstream hierarchy, highlighted alongside the nodes
    const [ancestorEdgeIds, setAncestorEdgeIds] = useState<Set<string>>(new Set());

    const {graph, getAuthorGraph, addDeclaration, getDeclarationIndex, addNode, removeNode, allDiagnostics, graphDirty, markGraphDirty, requestPlay} = useContext(InteractivityGraphContext);
    // the graph object identity we last rebuilt the canvas from; a load replaces graph identity
    // (setGraph), which is the signal to rebuild — interactive edits mutate the same object in
    // place and leave identity untouched, so they never retrigger a rebuild
    const lastSyncedGraphRef = useRef<AuthoredGraph | null>(null);

    // pan/select a node by id from the diagnostics counter popover
    const jumpToNode = useCallback((nodeUid: string) => {
        const target = nodes.find((n) => n.id === nodeUid);
        if (!target || !reactFlowInstance) { return; }
        setNodes((prev) => prev.map((n) => ({ ...n, selected: n.id === nodeUid })));
        reactFlowInstance.setCenter(target.position.x, target.position.y, { zoom: 1, duration: 500 });
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

    useEffect(() => {
        const container = reactFlowRef.current;
        if (!container || !reactFlowInstance) return;
        const handleWheel = (e: WheelEvent) => {
            if (isOverScrollableElement(e.target as Element, container)) return;
            e.preventDefault();
            const { x, y, zoom } = reactFlowInstance.getViewport();
            const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
            const newZoom = Math.min(2, Math.max(0.1, zoom * factor));
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const flowX = (mouseX - x) / zoom;
            const flowY = (mouseY - y) / zoom;
            reactFlowInstance.setViewport({
                x: mouseX - flowX * newZoom,
                y: mouseY - flowY * newZoom,
                zoom: newZoom,
            }, { duration: 0 });
        };
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [reactFlowInstance]);

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
        const isDynamicFlowSourceNode = hasNodeSpecFlag(interactivityNodeSpecs.find(n => n.op === sourceNode.op), NodeSpecFlag.DynamicFlowOutputs);

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

        if (!targetIsFlow) {
            const targetNode = document.querySelectorAll(`[data-id='${vals.target}']`)[0];
            const inputField = targetNode.querySelector(`#in-${vals.targetHandle}`) as HTMLInputElement;
            if (inputField !== null) {
                inputField.style.display = "none";
            }
            const typeDropdown = targetNode.querySelector(`#typeDropDown-${vals.targetHandle}`) as HTMLInputElement;
            if (typeDropdown !== null) {
                typeDropdown.style.display = "none";
            }
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
            const specTarget = interactivityNodeSpecs.find(n => n.op === targetNode.op)?.values?.input?.[vals.targetHandle!];
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
                // and persist it onto the followers + outputs; refresh the node + its outgoing edges
                propagateGroupType(targetNode, targetGroup);
                recolorEdges(targetNodeId!);
                bumpNodeData(targetNodeId!);
            }
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
    }, [nodes, graph, bumpNodeData]);

    // recolor a node's outgoing value edges to match its current output socket types
    // (called by nodes when a type changes, e.g. via the type dropdown or Pointer Type config)
    const recolorEdges = useCallback((nodeId: string) => {
        setEdges((eds: Edge[]) => eds.map((edge) => {
            if (edge.source !== nodeId) {
                return edge;
            }
            const sourceNode = graph.nodes.find(n => n.uid === nodeId);
            if (sourceNode === undefined) {
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
            return { ...edge, style: { ...(edge.style || {}), stroke, strokeWidth: 2 } };
        }));
    }, [graph]);

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

            const sourceNode = graph.nodes.find(node => node.uid === edge.source)!;
            const targetNode = graph.nodes.find(node => node.uid === edge.target)!;
            const isFlowConnection = sourceNode.flows?.output?.[edge.sourceHandle!] !== undefined;
        
            if (!isFlowConnection) {
                // flow so we need to show the input field now
                const targetNode = document.querySelectorAll(`[data-id='${edge.target}']`)[0];
                const inputField = targetNode.querySelector(`#in-${edge.targetHandle}`) as HTMLInputElement;
                if (inputField !== null) {
                    inputField.style.display = "block";
                }
                const typeDropdown = targetNode.querySelector(`#typeDropDown-${edge.targetHandle}`) as HTMLInputElement;
                if (typeDropdown !== null) {
                    typeDropdown.style.display = "block";
                }
            }
            
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
                const spec = interactivityNodeSpecs.find(n => n.op === targetNode.op);
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
                    recolorEdges(targetNode.uid!);
                }
                bumpNodeData(edge.target!);
            }
        }
        markGraphDirty();
    }, [graph, bumpNodeData]);

    const onNodesDelete = useCallback((nodes: Node[]) => {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            removeNode(node.id);
        }
    }, []);

    // handle adding nodes and edges to the graph
    const onAddNode = useCallback((nodeType: string, position: XYPosition) => {
        const uid = uuidv4();
        const nodeToAdd = {
            id: uid,
            type: nodeType,
            position: position,
            data: {events: graph.events, variables: graph.variables, types: standardTypes, uid: uid, op: nodeType, recolorEdges: recolorEdges, renameFlowSocket: renameFlowSocket}
        };

        const spec = interactivityNodeSpecs.find(node => node.op === nodeType)!;
        addDeclaration(toInteractivityDeclaration(spec));
        const interactivityNode: AuthoredNode = JSON.parse(JSON.stringify(spec));
        interactivityNode.declaration = getDeclarationIndex(nodeType);
        interactivityNode.uid = uid;
        
        addNode(interactivityNode);

        onNodesChange([{type: "add", item: nodeToAdd}]);
    }, [graph]);

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
                    if (ref.node && copiedIds.has(String(ref.node))) ref.node = uidMap.get(String(ref.node))!;
                    else newGn.values.input[key] = {};
                }
            }
            newGraphNodes.push(newGn);
            newFlowNodes.push({
                id: newUid,
                type: node.type,
                position: { x: node.position.x + OFFSET, y: node.position.y + OFFSET },
                data: { ...node.data, uid: newUid, recolorEdges, renameFlowSocket },
            } as Node);
        }

        for (const gn of newGraphNodes) {
            if (gn.op) {
                const spec = interactivityNodeSpecs.find(n => n.op === gn.op);
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
    }, [graph, nodes, addDeclaration, addNode, onNodesChange, setEdges, recolorEdges, renameFlowSocket]);

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

        const result = getAuthorGraph(graph);
        const loadedNodes: Node[] = result[0];
        for (const node of loadedNodes) {
            node.data.op = node.type;
            node.data.recolorEdges = recolorEdges;
            node.data.renameFlowSocket = renameFlowSocket;
            const isKnownOp = interactivityNodeSpecs.some(spec => spec.op === node.data.op);
            if (!isKnownOp) {
                node.type = "NoOp";
            }
            // seed the model with the (possibly auto-laid-out) positions immediately, so an
            // export right after load carries them instead of waiting for a drag (the old 5s
            // position timer used to backfill these)
            const graphNode = graph.nodes.find(graphNode => graphNode.uid === node.id);
            if (graphNode !== undefined) {
                graphNode.metadata = {positionX: node.position.x, positionY: node.position.y};
            }
        }
        setNodes(loadedNodes);
        setTimeout(() => {
            // react flow has an issue connecting handles for our custom nodes since they heavily rely on the node data
            // "Couldn’t create edge for source/target handle id: “some-id”; edge id" I tried to fix this using useUpdateNodeInternals()
            // to alert the AuthoringGraphNode of changes which would update the handles, it seems the hook does not work properly as advertised
            // soI am just adding a small delay between the node handles synthesizing synchronously and the edges being created in an async event
            setEdges(result[1]);
            reactFlowInstance?.fitView();
        }, 1000);
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
        e.preventDefault();
        const bounds = reactFlowRef.current!.getBoundingClientRect();
        const position = reactFlowInstance.project({
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top
        });
        mousePosRef.current = position;
        setAuthoringComponentModal(AuthoringComponentModelType.NODE_PICKER);
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
    const getAncestors = useCallback((nodeId: string): { nodeIds: Set<string>, edgeIds: Set<string> } => {
        const visitedNodes = new Set<string>();
        const visitedEdges = new Set<string>();
        const stack = [nodeId];
        while (stack.length > 0) {
            const current = stack.pop()!;
            for (const edge of edges) {
                if (edge.target === current && !visitedNodes.has(edge.source)) {
                    visitedNodes.add(edge.source);
                    visitedEdges.add(edge.id);
                    stack.push(edge.source);
                } else if (edge.target === current) {
                    visitedEdges.add(edge.id);
                }
            }
        }
        return { nodeIds: visitedNodes, edgeIds: visitedEdges };
    }, [edges]);

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
        <div style={{width: "100vw", height: "75vh", textAlign: "center", padding: 16}}>
            <h2 style={{padding: 16}}>Interactivity Graph Authoring</h2>
            <p>You can inspect and adjust the Interactivity Graph here.</p>
            <div
                ref={reactFlowRef}
                style={{width: "90%", height: "90%", border: "1px solid black", margin: "0 auto"}}
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
                    onEdgesDelete={onEdgesDelete}
                    onNodeDragStop={onNodeDragStop}
                    onSelectionChange={onSelectionChange}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    minZoom={0.1}
                    onPaneClick={handleLeftClick}
                    onPaneContextMenu={handleRightClick}
                    panOnDrag={[2]}
                    selectionOnDrag={true}
                    zoomOnScroll={false}
                    zoomOnDoubleClick={false}
                    preventScrolling={false}
                    deleteKeyCode="Delete"
                    fitView
                >
                    <Controls />
                    <Background />

                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.NODE_PICKER}>
                        <NodePickerComponent closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)} onAddNode={onAddNode} mousePos={mousePosRef.current}/>
                    </RenderIf>
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.GRAPH_SEARCH}>
                        <GraphSearchComponent
                            closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)}
                            onJumpToNode={jumpToNode}
                            onJumpToIndex={jumpToNodeIndex}
                        />
                    </RenderIf>
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.UPLOAD_GRAPH}>
                        <UploadGraphComponent closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)}/>
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

                    <Panel position={"top-center"} style={{width: "calc(100% - 32px)", maxWidth: 1100, margin: "10px 16px"}}>
                        <div className="graph-menu-bar">
                            <MenuBarButton
                                id={"variables-btn"}
                                icon={<IconVariables/>}
                                label={"Variables"}
                                isActive={authoringComponentModal === AuthoringComponentModelType.VARIABLES}
                                onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.VARIABLES)}
                            />
                            <MenuBarDivider/>
                            <MenuBarButton
                                id={"custom-events-btn"}
                                icon={<IconCustomEvents/>}
                                label={"Custom Events"}
                                isActive={authoringComponentModal === AuthoringComponentModelType.CUSTOM_EVENTS}
                                onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.CUSTOM_EVENTS)}
                            />
                            <MenuBarDivider/>
                            <MenuBarButton
                                id={"show-json-btn"}
                                icon={<IconJsonView/>}
                                label={"JSON View"}
                                isActive={authoringComponentModal === AuthoringComponentModelType.JSON_VIEW}
                                onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.JSON_VIEW)}
                            />
                            <MenuBarButton
                                id={"search-graph-btn"}
                                icon={<IconSearch/>}
                                label={"Search Graph"}
                                isActive={authoringComponentModal === AuthoringComponentModelType.GRAPH_SEARCH}
                                onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.GRAPH_SEARCH)}
                            />
                            <MenuBarButton
                                id={"show-node-list-btn"}
                                icon={<IconNodeTypes/>}
                                label={"Node Types"}
                                isActive={authoringComponentModal === AuthoringComponentModelType.NODE_LIST}
                                onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.NODE_LIST)}
                            />
                            <MenuBarButton
                                id={"upload-graph-btn"}
                                icon={<IconUpload/>}
                                label={"Upload Graph"}
                                isActive={authoringComponentModal === AuthoringComponentModelType.UPLOAD_GRAPH}
                                onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.UPLOAD_GRAPH)}
                            />
                            <ReloadIndicator dirty={graphDirty} onReload={requestPlay}/>
                            <DiagnosticsCounter diagnostics={allDiagnostics} onJumpToNode={jumpToNode}/>
                        </div>
                    </Panel>

                    <Panel position={"bottom-center"}>
                        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '0 14px', background: 'rgba(255,255,255,0.88)', border: '1px solid #ccc', borderRadius: 8, padding: '5px 14px', marginBottom: 6, fontSize: 11, color: '#000', userSelect: 'none', backdropFilter: 'blur(4px)' }}>
                            {([
                                ['Right-click', 'Add node'],
                                ['Right-drag', 'Pan'],
                                ['Left-drag', 'Multi-select'],
                                ['Scroll', 'Zoom'],
                                ['Ctrl+C / Ctrl+V', 'Copy / Paste'],
                                ['Ctrl+D', 'Duplicate'],
                                ['Del', 'Delete selected'],
                            ] as [string, string][]).map(([key, label]) => (
                                <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                    <kbd style={{ background: '#f0f0f0', border: '1px solid #bbb', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontFamily: 'monospace', boxShadow: '0 1px 0 #aaa', lineHeight: '16px', color: '#000' }}>{key}</kbd>
                                    <span>{label}</span>
                                </span>
                            ))}
                        </div>
                    </Panel>
                </ReactFlow>
            </div>
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

const nodeTypesByCategory = Object.keys(nodeTypes).reduce((categories, nodeType) => {
    const category = getNodeCategory(nodeType);
    (categories[category] = categories[category] ?? []).push(nodeType);
    return categories;
}, {} as {[category: string]: string[]});

const sortedNodeCategories = Object.keys(nodeTypesByCategory).sort((a, b) => a.localeCompare(b));

// spec-driven tooltip/search text for a node type's picker entry: op description plus every
// flow/value socket (value sockets include their description, flow sockets are name-only since
// IInteractivityFlow carries no description field)
const nodePickerSpecByType = interactivityNodeSpecs.reduce((specs, node) => {
    specs[node.op!] = node;
    return specs;
}, {} as {[nodeType: string]: AuthoredNode});

const NodePickerTooltipContent = (props: {nodeType: string}) => {
    const spec = nodePickerSpecByType[props.nodeType];
    if (!spec) { return <>{props.nodeType}</>; }
    return <NodeInfoTooltip sections={buildNodeTypeTooltipSections(spec)} />;
};

const getNodePickerSearchText = (nodeType: string): string => {
    const spec = nodePickerSpecByType[nodeType];
    return `${nodeType} ${spec?.description ?? ""}`.toLowerCase();
};

const NodePickerComponent = (props: {onAddNode: any, closeModal: any, mousePos: any}) => {
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

    const selectNode = (nodeType: string) => {
        props.onAddNode(nodeType, {x: props.mousePos.x, y: props.mousePos.y});
        props.closeModal()
    }

    const toggleCategory = (category: string) => {
        setActiveCategory(activeCategory === category ? null : category);
    }

    const normalizedFilter = filter.trim().toLowerCase();

    return (
        <Panel id={"node-picker-panel"} position={"top-center"} style={{border: "1px solid gray", background: "white", textAlign: "left", zIndex: 10, width: "min(820px, 75%)"}}>
            <Container fluid style={{padding: 0}}>
                <h3 style={{textAlign: "center", paddingTop: 8}}>
                    Add Node
                </h3>
                <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                <Form.Control
                    data-testid={"node-picker-search"}
                    style={{margin: "0 auto", width: "90%"}}
                    type="text"
                    autoFocus={true}
                    onChange={(e) => setFilter(e.target.value)}
                    value={filter}
                    placeholder="Search nodes..."
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px auto 0", width: "90%" }}>
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
                <div ref={nodeListRef} onWheel={onNodeListWheel} style={{ columnWidth: 200, columnGap: 24, maxHeight: "min(40vh, calc(100vh - 260px))", overflowX: "auto", overflowY: "auto", overscrollBehavior: "contain", marginTop: 16, padding: "0 16px 8px" }}>
                    {
                        sortedNodeCategories.map(category => {
                            const nodesInCategory = nodeTypesByCategory[category].filter(nodeType =>
                                normalizedFilter === "" || getNodePickerSearchText(nodeType).includes(normalizedFilter)
                            );
                            const shouldShowCategory = nodesInCategory.length > 0 && (activeCategory === null || activeCategory === category);
                            return (
                                <RenderIf key={category} shouldShow={shouldShowCategory}>
                                    <div style={{ breakInside: "avoid", marginBottom: 16 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "bold", color: "#555", borderBottom: `3px solid ${getNodeCategoryColor(category)}`, paddingBottom: 4, marginBottom: 8 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: getNodeCategoryColor(category), display: "inline-block", flexShrink: 0 }} />
                                            {category}
                                        </div>
                                        {
                                            nodesInCategory.map(nodeType => (
                                                <OverlayTrigger
                                                    key={nodeType}
                                                    placement={"right"}
                                                    delay={{show: 300, hide: 0}}
                                                    overlay={
                                                        <Tooltip id={`node-picker-tooltip-${nodeType}`} className="node-info-tooltip">
                                                            <NodePickerTooltipContent nodeType={nodeType} />
                                                        </Tooltip>
                                                    }
                                                >
                                                    <p className="node-picker-item" style={{overflowWrap: "anywhere"}} onClick={() => selectNode(nodeType)} data-testid={`node-picker-${nodeType}`}>{nodeType}</p>
                                                </OverlayTrigger>
                                            ))
                                        }
                                    </div>
                                </RenderIf>
                            )
                        })
                    }
                </div>
                <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                <div style={{textAlign: "center", marginBottom: 16}}>
                    <Button variant={"outline-danger"} onClick={() => props.closeModal()}>Close</Button>
                </div>
            </Container>
        </Panel>
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
    const {getExecutableGraph} = useContext(InteractivityGraphContext);
    const graph = getExecutableGraph();
    const copyToClipboard = async () => {
        const jsonString = JSON.stringify(getExecutableGraph(), undefined, '\t');
        await navigator.clipboard.writeText(jsonString);

        setCopied(true)
        setTimeout(() => {
            setCopied(false);
        }, 2000); // Reset the copied state after 2 seconds
    };

    return (
        <Panel id={"show-json-view-panel"} position={"top-center"} style={{border:"1px solid gray", background: "white", zIndex: 10}}>
            <Container style={{padding: 16, width: "80vw", maxWidth: 1000}}>
                <h3>JSON View</h3>
                <div style={{
                    textAlign: "left",
                    overflow: "auto",
                    overscrollBehavior: "contain",
                    height: "40vh",
                    maxHeight: "calc(100vh - 220px)",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    padding: 8,
                    background: "#fafafa",
                    fontFamily: "monospace",
                    fontSize: 13,
                }}>
                    <JsonTreeNode value={graph} isLast={true} />
                </div>
                <Row style={{ marginTop: 16 }}>
                    <Col xs={12} md={6}>
                        <Button variant={"outline-primary"}  style={{width: "100%"}} onClick={copyToClipboard}>
                            {copied ? 'Copied!' : 'Copy to Clipboard'}
                        </Button>
                    </Col>
                    <Col xs={12} md={6}>
                        <Button variant={"outline-danger"} style={{width: "100%"}} onClick={() => props.closeModal()}>
                            Cancel
                        </Button>
                    </Col>
                </Row>
            </Container>
        </Panel>
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
        <Panel id={"node-list-panel"} position={"top-center"} style={{border:"1px solid gray", background: "white", zIndex: 10}}>
            <Container style={{padding: 16}}>
                <h3>Node List</h3>
                <pre style={{textAlign: "left", overflow:"scroll", overscrollBehavior: "contain", height: 400, width: 400}}>{getDataString()}</pre>
                <Row style={{ marginTop: 16 }}>
                    <Col xs={12} md={6}>
                        <Button variant={"outline-primary"}  style={{width: "100%"}} onClick={copyToClipboard}>
                            {copied ? 'Copied!' : 'Copy to Clipboard'}
                        </Button>
                    </Col>
                    <Col xs={12} md={6}>
                        <Button variant={"outline-danger"} style={{width: "100%"}} onClick={() => props.closeModal()}>
                            Cancel
                        </Button>
                    </Col>
                </Row>
            </Container>
        </Panel>
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
        <Panel id={"graph-search-panel"} position={"top-center"} style={{border: "1px solid gray", background: "white", zIndex: 10}}>
            <Container style={{padding: 16, width: 720, maxWidth: "92vw"}}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                    <h3 style={{margin: 0}}>Search Graph</h3>
                    <Button variant={"outline-danger"} size={"sm"} onClick={() => props.closeModal()}>Close</Button>
                </div>
                <hr style={{ borderTop: "1px solid #777", margin: "12px 0" }} />

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

                <div style={{marginTop: 12, border: "1px solid #ddd", borderRadius: 6, maxHeight: "min(44vh, calc(100vh - 290px))", overflowY: "auto", textAlign: "left", padding: 8}}>
                    {trimmedQuery === "" && (
                        <div style={{fontSize: 13, color: "#777", padding: "8px 6px"}}>
                            Search matches node operation names and string values in node configuration (including pointer templates).
                        </div>
                    )}
                    {trimmedQuery !== "" && results.length === 0 && (
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
            </Container>
        </Panel>
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

    return (
        <Panel id={"variables-panel"} position={"top-center"} style={{border:"1px solid gray", background: "white", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.15)", zIndex: 10}}>
            <Container fluid style={{ padding: 16, width: 1080, maxWidth: "95vw" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>Variables</h3>
                    <Button variant={"outline-danger"} size={"sm"} onClick={() => props.closeModal()}>Close</Button>
                </div>
                <hr style={{ borderTop: '1px solid #777', margin: '12px 0' }} />
                <div style={{ display: "flex", gap: 16, height: "min(460px, calc(100vh - 210px))" }}>
                    {/* left: editable list of variables */}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        {/* overflowX hidden avoids the horizontal scrollbar Bootstrap's negative
                            row gutters would otherwise trigger (overflow-y:auto forces x to auto too) */}
                        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain", textAlign: "left", paddingRight: 4 }}>
                            {variables.length === 0 && (
                                <p style={{ color: "#888", textAlign: "center", marginTop: 32 }}>
                                    No variables yet. Add one to get started.
                                </p>
                            )}
                            {variables.length > 0 && (
                                <Row style={{ marginBottom: 0, marginLeft: 0, marginRight: 0 }}>
                                    <Col style={{ flexGrow: 2 }}><span style={{ fontSize: 11, color: "#999" }}>ID</span></Col>
                                    <Col xs={2}><span style={{ fontSize: 11, color: "#999" }}>Type</span></Col>
                                    <Col xs={4}><span style={{ fontSize: 11, color: "#999" }}>Value</span></Col>
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
                                        <Col xs={4}>
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

                    {/* right: live JSON view — fixed width so the extra panel width goes to the
                        variables list on the left rather than widening the JSON pane */}
                    <div style={{ width: 380, flexShrink: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>JSON</span>
                        <pre style={{ flex: 1, margin: 0, overflow: "auto", overscrollBehavior: "contain", textAlign: "left", border: "1px solid #ccc", borderRadius: 4, padding: 8, background: "#f5f5f5", fontSize: 12 }}>
                            {JSON.stringify(toGraphVariables(variables), undefined, 2)}
                        </pre>
                    </div>
                </div>
            </Container>
        </Panel>
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
        <Panel id={"custom-events-panel"} position={"top-center"} style={{border:"1px solid gray", background: "white", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.15)", zIndex: 10}}>
            <Container fluid style={{ padding: 16, width: 1100, maxWidth: "95vw" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>Custom Events</h3>
                    <Button variant={"outline-danger"} size={"sm"} onClick={() => props.closeModal()}>Close</Button>
                </div>
                <hr style={{ borderTop: '1px solid #777', margin: '12px 0' }} />
                <div style={{ display: "flex", gap: 16, height: "min(460px, calc(100vh - 210px))" }}>
                    {/* left: editable list of events */}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", textAlign: "left", paddingRight: 4 }}>
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
                                                <Col xs={4}><span style={{ fontSize: 11, color: "#999" }}>Default</span></Col>
                                                <Col style={{ width: 44, flexShrink: 0, padding: 0 }}></Col>
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
                                                    <Col xs={4}>
                                                        <TypedValueInput
                                                            typeIndex={val.type}
                                                            value={val.defaultValue}
                                                            onChange={(v) => updateValue(eventIndex, valueIndex, { defaultValue: v })}
                                                        />
                                                    </Col>
                                                    <Col style={{ width: 44, flexShrink: 0, padding: "0 4px", textAlign: "right" }}>
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

                    {/* right: live JSON view */}
                    <div style={{ flex: 0.8, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>JSON</span>
                        <pre style={{ flex: 1, margin: 0, overflow: "auto", overscrollBehavior: "contain", textAlign: "left", border: "1px solid #ccc", borderRadius: 4, padding: 8, background: "#f5f5f5", fontSize: 12 }}>
                            {JSON.stringify(toGraphEvents(events), undefined, 2)}
                        </pre>
                    </div>
                </div>
            </Container>
        </Panel>
    )
}

const UploadGraphComponent = (props: { closeModal: any}) => {
    const graphRef = useRef<HTMLTextAreaElement>(null);
    const [error, setError] = useState<string | null>(null);
    const {loadGraphFromJson} = useContext(InteractivityGraphContext);
    const uploadGraph = () => {
        if (graphRef.current === null || graphRef.current.value === "") {return}

        try {
            loadGraphFromJson(JSON.parse(graphRef.current.value));
        } catch (e) {
            // covers both invalid JSON and malformed/incomplete graph structure
            setError(`Could not load graph: ${e instanceof Error ? e.message : String(e)}`);
            return;
        }
        setError(null);
        props.closeModal();
    }

    return (
        <Panel id={"upload-graph-panel"} position={"top-center"} style={{border:"1px solid gray", background: "white", zIndex: 10}}>
            <Container style={{padding: 16, width: 600}}>
                <h3>Upload graph</h3>
                <Row style={{textAlign: "left"}}>
                    <Col>
                        <Form.Group>
                            <Form.Label>Graph JSON</Form.Label>
                            <Form.Control ref={graphRef} as="textarea" rows={10}/>
                        </Form.Group>
                    </Col>
                </Row>
                {error !== null &&
                    <Row style={{ marginTop: 8 }}>
                        <Col>
                            <div style={{ color: "#b00020", fontSize: 13, whiteSpace: "pre-wrap" }}>{error}</div>
                        </Col>
                    </Row>
                }
                <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                <Row style={{ marginTop: 16 }}>
                    <Col xs={12} md={6}>
                        <Button variant={"outline-primary"} id={"upload-graph-btn"} style={{width: "100%"}} onClick={() => {uploadGraph()}}>Load</Button>
                    </Col>
                    <Col xs={12} md={6}>
                        <Button variant={"outline-danger"} style={{width: "100%"}} onClick={() => props.closeModal()}>
                            Cancel
                        </Button>
                    </Col>
                </Row>
            </Container>
        </Panel>
    );
}

