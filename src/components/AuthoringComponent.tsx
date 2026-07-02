import ReactFlow, {
    addEdge, Background,
    Connection, Controls,
    Edge,
    Node,
    NodeChange,
    NodeTypes, Panel, useEdgesState, useNodesState, useReactFlow, XYPosition
} from 'reactflow';
import {AuthoringGraphNode} from "../authoring/AuthoringGraphNode";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {v4 as uuidv4} from "uuid";
import {RenderIf} from "./RenderIf";
import {Button, Col, Container, Row, Form} from "react-bootstrap";
import 'reactflow/dist/style.css';
import {Spacer} from "./Spacer";
import {interactivityNodeSpecs, knownDeclarations, standardTypes} from "../BasicBehaveEngine/types/nodes";
import { IInteractivityDeclaration, IInteractivityEvent, IInteractivityNode, IInteractivityVariable } from '../BasicBehaveEngine/types/InteractivityGraph';
import { InteractivityGraphContext } from '../InteractivityGraphContext';
import { FLOW_COLOR, getColorForTypeIndex } from '../authoring/socketColors';
import { TypedValueInput } from '../authoring/TypedValueInput';

const nodeTypes = interactivityNodeSpecs.reduce((nodes, node) => {
    nodes[knownDeclarations[node.declaration].op] = (props: any) => {
        return <AuthoringGraphNode {...props} />;
    };
    return nodes;
}, {} as NodeTypes);

nodeTypes["NoOp"] = (props: any) => {
    props.data.isNoOp = true;
    return <AuthoringGraphNode {...props} />;
};  


enum AuthoringComponentModelType {
    NODE_PICKER,
    JSON_VIEW,
    NODE_LIST,
    UPLOAD_GRAPH,
    CUSTOM_EVENTS,
    VARIABLES,
    NONE
}

const nodesWithConfigurations = interactivityNodeSpecs.filter(node => node.configuration !== undefined).map(node => knownDeclarations[node.declaration].op);

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
    
    const {graph, needsSyncingToAuthor, setNeedsSyncingToAuthor, getAuthorGraph, addDeclaration, getDeclarationIndex, addNode, removeNode} = useContext(InteractivityGraphContext);

    //to handle the node picker props
    const mousePosRef = useRef({x:0, y:0});
    const clipboardRef = useRef<Node[]>([]);

    useEffect(() => {
        const updatePositions = setInterval(() => {
            for (const node of nodes) {
                const graphNode = graph.nodes.find(graphNode => graphNode.uid === node.id);
                if (graphNode !== undefined) {
                    graphNode.metadata = {positionX: node.position.x, positionY: node.position.y};
                }
            }
        }, 5000);
        return () => clearInterval(updatePositions);
    }, [nodes, graph])

    useEffect(() => {
        const container = reactFlowRef.current;
        if (!container || !reactFlowInstance) return;
        const handleWheel = (e: WheelEvent) => {
            if (isOverScrollableElement(e.target as Element, container)) return;
            e.preventDefault();
            if (e.deltaY < 0) {
                reactFlowInstance.zoomIn({ duration: 0 });
            } else {
                reactFlowInstance.zoomOut({ duration: 0 });
            }
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

    // handle creation and deletion of edges
    const onConnect = useCallback((vals: Edge<any> | Connection) => {
        const sourceNodeId = vals.source;
        const sourceNode: IInteractivityNode = graph.nodes.find(node => node.uid === sourceNodeId)!;

        const targetNodeId = vals.target;
        const targetNode: IInteractivityNode = graph.nodes.find(node => node.uid === targetNodeId)!;

        if (sourceNodeId === targetNodeId) {return}

        const isConfigurableSocket = nodesWithConfigurations.includes(sourceNode.op!) || nodesWithConfigurations.includes(targetNode.op!) || sourceNode.op === "flow/sequence";
       
        // if one is flow and one isn't then do not connect
        const sourceIsFlow = sourceNode.flows?.output?.[vals.sourceHandle!] !== undefined;
        const targetIsFlow = targetNode.flows?.input?.[vals.targetHandle!] !== undefined;
        if (!isConfigurableSocket && targetIsFlow !== sourceIsFlow) {return}

        if (!sourceIsFlow && !targetIsFlow) {
            // make sure the valueTypes are compatible
            const sourceValueTypes = sourceNode.values?.output?.[vals.sourceHandle!].typeOptions;
            const targetValueTypes = targetNode.values?.input?.[vals.targetHandle!].typeOptions;
            if (!isConfigurableSocket && (sourceValueTypes === undefined || targetValueTypes === undefined || !hasIntersection(sourceValueTypes, targetValueTypes))) {return}
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
            targetNode!.values!.input![vals.targetHandle!] = {node: sourceNode.uid, socket: vals.sourceHandle!}
        }

        // color the wiring by the source socket type (or flow color for flow connections)
        const edgeColor = sourceIsFlow
            ? FLOW_COLOR
            : getColorForTypeIndex(sourceNode.values?.output?.[vals.sourceHandle!]?.type);
        setEdges((eds: any) => addEdge({ ...vals, style: { stroke: edgeColor, strokeWidth: 2 } }, eds));
    }, [nodes, graph]);

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
            const stroke = getColorForTypeIndex(sourceNode.values?.output?.[edge.sourceHandle!]?.type);
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
                const typeDropdown = targetNode.querySelector(`#${edge.targetHandle}-typeDropDown`) as HTMLInputElement;
                if (typeDropdown !== null) {
                    typeDropdown.style.display = "block";
                }
            }
            
            if (isFlowConnection) {
                // flow so we should remove the flow value from the node
                sourceNode!.flows!.output![edge.sourceHandle!] = {};
            } else {
                // value so we should remove the value from the target node
                targetNode!.values!.input![edge.targetHandle!] = {};
            }
        }
    }, [graph]);

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

        const declaration: IInteractivityDeclaration = knownDeclarations.find(node => node.op === nodeType)!;
        addDeclaration(declaration);
        const interactivityNode: IInteractivityNode = JSON.parse(JSON.stringify(interactivityNodeSpecs.find(node => node.op === nodeType)!));
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

        const newGraphNodes: IInteractivityNode[] = [];
        const newFlowNodes: Node[] = [];

        for (const node of clipboardRef.current) {
            const newUid = uidMap.get(node.id)!;
            const srcGn = graph.nodes.find(n => n.uid === node.id);
            if (!srcGn) continue;
            const newGn: IInteractivityNode = JSON.parse(JSON.stringify(srcGn));
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
                const decl = knownDeclarations.find(d => d.op === gn.op);
                if (decl) addDeclaration(decl);
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
                            const stroke = getColorForTypeIndex(srcGn.values?.output?.[ref.socket!]?.type);
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

    useEffect(() => {
        if (needsSyncingToAuthor) {
            const result = getAuthorGraph(graph);
            const loadedNodes: Node[] = result[0];
            for (const node of loadedNodes) {
                node.data.op = node.type;
                node.data.recolorEdges = recolorEdges;
                node.data.renameFlowSocket = renameFlowSocket;
                const declarationIndex = knownDeclarations.findIndex(declaration => declaration.op === node.data.op);
                if (declarationIndex === -1) {
                    node.type = "NoOp";
                }
            }
            // console.log(loadedNodes)
            // console.log(result[1])
            setNodes(loadedNodes);
            setTimeout(() => {
                // react flow has an issue connecting handles for our custom nodes since they heavily rely on the node data 
                // "Couldn’t create edge for source/target handle id: “some-id”; edge id" I tried to fix this using useUpdateNodeInternals()
                // to alert the AuthoringGraphNode of changes which would update the handles, it seems the hook does not work properly as advertised
                // soI am just adding a small delay between the node handles synthesizing synchronously and the edges being created in an async event
                setEdges(result[1]);
            }, 1000);
            setNeedsSyncingToAuthor(false);
        }
    }, [needsSyncingToAuthor]);

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

    return (
        <div style={{width: "100vw", height: "75vh", textAlign: "center", padding: 16}}>
            <h2 style={{padding: 16}}>Interactivity Graph Authoring</h2>
            <p>You can inspect and adjust the Interactivity Graph here.</p>
            <div
                ref={reactFlowRef}
                style={{width: "90%", height: "90%", border: "1px solid black", margin: "0 auto"}}
                data-testid={"authoring-view"}
                onContextMenu={(e) => e.preventDefault()}
            >
                <ReactFlow
                    id={"flow-container"}
                    nodes={nodes}
                    onNodesChange={onNodesChange}
                    edges={edges}
                    onEdgesChange={onEdgesChange}
                    onNodesDelete={onNodesDelete}
                    onInit={setReactFlowInstance}
                    onConnect={onConnect}
                    onEdgesDelete={onEdgesDelete}
                    nodeTypes={nodeTypes}
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

                    <Panel position={"top-right"}>
                        <div style={{ display: 'flex', flexDirection: 'column', border: "1px solid gray", padding: 16, marginRight: 8, borderRadius: 16, background: "white"}}>
                            <h3>Menu</h3>
                            <hr/>
                            <Button variant="outline-primary" id={'variables-btn'} onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.VARIABLES)}>Variables</Button>
                            <hr/>
                            <Spacer width={0} height={8}/>
                            <Button variant="outline-primary" id={"custom-events-btn"} onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.CUSTOM_EVENTS)}>Custom Events</Button>
                            <Spacer width={0} height={8}/>
                            <hr/>
                            <Button variant="outline-primary" id={"show-json-btn"} onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.JSON_VIEW)}>JSON View</Button>
                            <Spacer width={0} height={8}/>
                            <Button variant="outline-primary" id={"show-node-list-btn"} onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.NODE_LIST)}>Node Types</Button>
                            <Spacer width={0} height={8}/>
                            <Button variant="outline-primary" id={"upload-graph-btn"} onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.UPLOAD_GRAPH)}>Upload Graph</Button>
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

const NodePickerComponent = (props: {onAddNode: any, closeModal: any, mousePos: any}) => {
    const [filter, setFilter] = useState("");

    const selectNode = (nodeType: string) => {
        props.onAddNode(nodeType, {x: props.mousePos.x, y: props.mousePos.y});
        props.closeModal()
    }

    return (
        <Panel id={"node-picker-panel"} position={"top-center"} style={{border: "1px solid gray", background: "white", textAlign: "left", zIndex: 10}}>
            <Container style={{padding: 0}}>
                <h3 style={{textAlign: "center", paddingTop: 8}}>
                    Add Node
                </h3>
                <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                <Form.Control
                    data-testid={"node-picker-search"}
                    style={{margin: "0 auto", width: "90%"}}
                    type="text"
                    onChange={(e) => setFilter(e.target.value)}
                    value={filter}
                    placeholder="Search nodes..."
                />
                <div style={{ height: "128px", overflowY:"scroll", marginTop: 8, width: "100%"}}>
                    {
                        Object.entries(nodeTypes).map((value, index) => {
                            return (
                                <RenderIf key={value[0]} shouldShow={filter === "" || value[0].toLowerCase().includes(filter.toLowerCase())}>
                                    <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                                    <p style={{marginLeft: 8}} onClick={() => selectNode(value[0])} data-testid={`node-picker-${value[0]}`}>{value[0]}</p>
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

const JSONViewComponent = (props: {closeModal: any}) => {
    const [copied, setCopied] = useState(false);
    const {getExecutableGraph} = useContext(InteractivityGraphContext);
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
            <Container style={{padding: 16}}>
                <h3>JSON View</h3>
                <pre style={{textAlign: "left", overflow:"scroll", height: 400, width: 400}}>{JSON.stringify(getExecutableGraph(), undefined, ' ')}</pre>
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
                <pre style={{textAlign: "left", overflow:"scroll", height: 400, width: 400}}>{getDataString()}</pre>
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
                <div style={{ display: "flex", gap: 16, height: 460 }}>
                    {/* left: editable list of variables */}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        {/* overflowX hidden avoids the horizontal scrollbar Bootstrap's negative
                            row gutters would otherwise trigger (overflow-y:auto forces x to auto too) */}
                        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", textAlign: "left", paddingRight: 4 }}>
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
                        <pre style={{ flex: 1, margin: 0, overflow: "auto", textAlign: "left", border: "1px solid #ccc", borderRadius: 4, padding: 8, background: "#f5f5f5", fontSize: 12 }}>
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
                <div style={{ display: "flex", gap: 16, height: 460 }}>
                    {/* left: editable list of events */}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <div style={{ flex: 1, overflowY: "auto", textAlign: "left", paddingRight: 4 }}>
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
                        <pre style={{ flex: 1, margin: 0, overflow: "auto", textAlign: "left", border: "1px solid #ccc", borderRadius: 4, padding: 8, background: "#f5f5f5", fontSize: 12 }}>
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
    const {loadGraphFromJson} = useContext(InteractivityGraphContext);
    const uploadGraph = () => {
        if (graphRef.current === null || graphRef.current.value === "") {return}

        loadGraphFromJson(JSON.parse(graphRef.current.value));
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

