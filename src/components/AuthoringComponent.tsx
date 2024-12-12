import ReactFlow, {
    addEdge, Background,
    Connection, Controls,
    Edge,
    NodeTypes, Panel, useEdgesState, useNodesState, useReactFlow, XYPosition
} from 'reactflow';
import {authoringNodeSpecs, ICustomEvent, IVariable, standardTypes} from "../authoring/AuthoringNodeSpecs";
import {AuthoringGraphNode} from "../authoring/AuthoringGraphNode";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {v4 as uuidv4} from "uuid";
import {useArray} from "../hooks/useArray";
import {RenderIf} from "./RenderIf";
import {Button, Col, Container, Row, Form} from "react-bootstrap";
import 'reactflow/dist/style.css';
import {authorToBehave} from "../authoring/AuthorToBehave";
import {behaveToAuthor} from "../authoring/BehaveToAuthor";
import {Spacer} from "./Spacer";

const nodeTypes = authoringNodeSpecs.reduce((nodes, node) => {
    nodes[node.type] = (props: any) => <AuthoringGraphNode node={node} {...props} />;
    return nodes;
}, {} as NodeTypes);

enum AuthoringComponentModelType {
    NODE_PICKER,
    JSON_VIEW,
    UPLOAD_GRAPH,
    ADD_CUSTOM_EVENT,
    SHOW_CUSTOM_EVENTS,
    ADD_VARIABLE,
    SHOW_VARIABLES,
    NONE
}

const nodesWithConfigurations = authoringNodeSpecs.filter(node => node.configuration.length > 0).map(node => node.type);
export const AuthoringComponent = (props: {behaveGraphRef: any, behaveGraphFromGlTF: any}) => {
    const reactFlowRef = useRef<HTMLDivElement | null>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [authoringComponentModal, setAuthoringComponentModal] = useState<AuthoringComponentModelType>(AuthoringComponentModelType.NONE)

    // to handle nodes and edges in graph
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const {array: events, setArray: setEvents, push: pushEvent} = useArray([]);
    const {array: variables, setArray: setVariables, push: pushVariable} = useArray([]);

    //to handle the node picker props
    const [mousePos, setMousePos] = useState({x:0, y:0});

    const hasIntersection = (arr1: string[], arr2: string[]): boolean => {
        const set1 = new Set(arr1);

        for (const item of arr2) {
            if (set1.has(item)) {
                return true;
            }
        }

        return false;
    }

    useEffect(() => {
        props.behaveGraphRef.current = getBehaveGraph()
    }, [nodes, edges, events, variables])

    useEffect(() => {
        if (props.behaveGraphFromGlTF !== null) {
            setBehaveGraph(JSON.stringify(props.behaveGraphFromGlTF));
        }
    }, [props.behaveGraphFromGlTF])

    // handle creation and deletion of edges
    const onConnect = useCallback((vals: Edge<any> | Connection) => {
        const sourceNodeId = vals.source;
        const sourceNodeType = nodes.find(node => node.id === sourceNodeId)!.type;
        const sourceNodeSpec = authoringNodeSpecs.find(nodeSpec => nodeSpec.type === sourceNodeType);
        if (sourceNodeSpec === undefined) {return}

        const targetNodeId = vals.target;
        const targetNodeType = nodes.find(node => node.id === targetNodeId)!.type;
        const targetNodeSpec = authoringNodeSpecs.find(nodeSpec => nodeSpec.type === targetNodeType);
        if (targetNodeSpec === undefined) {return}

        if (sourceNodeId === targetNodeId) {return}

        const isConfigurableSocket = nodesWithConfigurations.includes(sourceNodeSpec.type) || nodesWithConfigurations.includes(targetNodeSpec.type) || sourceNodeType === "flow/sequence";

        // if one is flow and one isn't then do not connect
        const sourceIsFlow = sourceNodeSpec.output.flows.find(flow => flow.id === vals.sourceHandle) !== undefined;
        const targetIsFlow = targetNodeSpec.input.flows.find(flow => flow.id === vals.targetHandle) !== undefined;
        if (!isConfigurableSocket && targetIsFlow !== sourceIsFlow) {return}

        if (!sourceIsFlow && !targetIsFlow) {
            // make sure the valueTypes are compatible
            const sourceValueTypes = sourceNodeSpec.output.values.find(output => output.id === vals.sourceHandle)?.types;
            const targetValueTypes = targetNodeSpec.input.values.find(input => input.id === vals.targetHandle)?.types;
            if (!isConfigurableSocket && (sourceValueTypes === undefined || targetValueTypes === undefined || !hasIntersection(sourceValueTypes, targetValueTypes))) {return}
        }

        if (!targetIsFlow) {
            const targetNode = document.querySelectorAll(`[data-id='${vals.target}']`)[0];
            const inputField = targetNode.querySelector(`#in-${vals.targetHandle}`) as HTMLInputElement;
            if (inputField !== null) {
                inputField.style.display = "none";
            }
            const typeDropdown = targetNode.querySelector(`#${vals.targetHandle}-typeDropDown`) as HTMLInputElement;
            if (typeDropdown !== null) {
                typeDropdown.style.display = "none";
            }
        }

        setEdges((eds: any) => addEdge(vals, eds));
    }, [nodes]);

    const onEdgesDelete = useCallback((edges: Edge[]) => {
        for (let i = 0; i < edges.length; i++) {
            if (edges[0].targetHandle !== "flow") {
                const targetNode = document.querySelectorAll(`[data-id='${edges[0].target}']`)[0];
                const inputField = targetNode.querySelector(`#in-${edges[0].targetHandle}`) as HTMLInputElement;
                if (inputField !== null) {
                    inputField.style.display = "block";
                }
                const typeDropdown = targetNode.querySelector(`#${edges[0].targetHandle}-typeDropDown`) as HTMLInputElement;
                if (typeDropdown !== null) {
                    typeDropdown.style.display = "block";
                }
            }
        }
    }, []);

    // handle adding nodes and edges to the graph
    const onAddNode = useCallback((nodeType: string, position: XYPosition) => {
        const nodeToAdd = {
            id: uuidv4(),
            type: nodeType,
            position: position,
            data: {events: events, variables: variables, types: standardTypes}
        };

        onNodesChange([{type: "add", item: nodeToAdd}]);
    }, [events, variables]);

    const getBehaveGraph = () => {
        return authorToBehave(nodes, edges, events, variables);
    }

    const setBehaveGraph = (behaveGraph: string) => {
        const result = behaveToAuthor(behaveGraph);
        console.log(result);
        setNodes(result[0]);
        setEdges(result[1]);
        setEvents(result[2]);
        setVariables(result[3]);
    }

    // handle clicking on the react flow pane
    const handleRightClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const bounds = reactFlowRef.current!.getBoundingClientRect();

        const position = reactFlowInstance.project({
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top
        });

        setMousePos(position);
        setAuthoringComponentModal(AuthoringComponentModelType.NODE_PICKER)
    };

    const handleLeftClick = (e: React.MouseEvent) => {
        e.preventDefault();
       setAuthoringComponentModal(AuthoringComponentModelType.NONE)
    }

    return (
        <div style={{width: "100vw", height: "75vh", textAlign: "center", padding: 16}}>
            <h2 style={{padding: 16}}>Behave Graph Authoring</h2>
            <div ref={reactFlowRef} style={{width: "90%", height: "90%", border: "1px solid black", margin: "0 auto"}}>
                <ReactFlow
                    id={"flow-container"}
                    nodes={nodes}
                    onNodesChange={onNodesChange}
                    edges={edges}
                    onEdgesChange={onEdgesChange}
                    onInit={setReactFlowInstance}
                    onConnect={onConnect}
                    onEdgesDelete={onEdgesDelete}
                    nodeTypes={nodeTypes}
                    minZoom={0.1}
                    onPaneContextMenu={handleRightClick}
                    onPaneClick={handleLeftClick}
                    fitView
                >
                    <Controls />
                    <Background />

                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.NODE_PICKER}>
                        <NodePickerComponent closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)} onAddNode={onAddNode} mousePos={mousePos}/>
                    </RenderIf>
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.UPLOAD_GRAPH}>
                        <UploadGraphComponent setBehaveGraph={setBehaveGraph} closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)}/>
                    </RenderIf>
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.JSON_VIEW}>
                        <JSONViewComponent closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)} getBehaviorGraph={getBehaveGraph}/>
                    </RenderIf>
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.ADD_CUSTOM_EVENT}>
                        <AddCustomEventComponent closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)} pushCustomEvent={pushEvent}/>
                    </RenderIf>
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.SHOW_CUSTOM_EVENTS}>
                        <ShowCustomEventComponent closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)} events={events}/>
                    </RenderIf>
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.ADD_VARIABLE}>
                        <AddVariableComponent closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)} pushVariable={pushVariable}/>
                    </RenderIf>
                    <RenderIf shouldShow={authoringComponentModal === AuthoringComponentModelType.SHOW_VARIABLES}>
                        <ShowVariableComponent closeModal={() => setAuthoringComponentModal(AuthoringComponentModelType.NONE)} variables={variables}/>
                    </RenderIf>

                    <Panel position={"top-right"}>
                        <div style={{ display: 'flex', flexDirection: 'column', border: "1px solid gray", padding: 16, marginRight: 8, borderRadius: 16, background: "white"}}>
                            <h3>Menu</h3>
                            <hr/>
                            <Button variant="outline-primary" id={"add-variable-btn"} onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.ADD_VARIABLE)}>Add Variable</Button>
                            <Spacer width={0} height={8}/>
                            <Button variant="outline-primary" id={'show-variables-btn'} onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.SHOW_VARIABLES)}>Show Variables</Button>
                            <hr/>
                            <Spacer width={0} height={8}/>
                            <Button variant="outline-primary" id={"add-custom-event-btn"} onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.ADD_CUSTOM_EVENT)}>Add Custom Event</Button>
                            <Spacer width={0} height={8}/>
                            <Button variant="outline-primary" id={'show-custom-event-btn'} onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.SHOW_CUSTOM_EVENTS)}>Show Custom Events</Button>
                            <Spacer width={0} height={8}/>
                            <hr/>
                            <Button variant="outline-primary" id={"show-json-btn"} onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.JSON_VIEW)}>JSON View</Button>
                            <Spacer width={0} height={8}/>
                            <Button variant="outline-primary" id={"upload-graph-btn"} onClick={() => setAuthoringComponentModal(AuthoringComponentModelType.UPLOAD_GRAPH)}>Upload Graph</Button>
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
        <Panel id={"node-picker-panel"} position={"top-center"} style={{border: "1px solid gray", background: "white", textAlign: "left"}}>
            <Container style={{padding: 0}}>
                <h3 style={{textAlign: "center", paddingTop: 8}}>
                    Add Node
                </h3>
                <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                <Form.Control
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
                                    <p style={{marginLeft: 8}} onClick={() => selectNode(value[0])}>{value[0]}</p>
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

const ShowVariableComponent = (props: {closeModal: any, variables: any}) => {
    return (
        <Panel id={"show-variable-panel"} position={"top-center"} style={{border:"1px solid gray", background: "white", height: 500}}>
           <Container style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', height: 500 }}>
                <h3>Variables</h3>
                <div style={{ flex: 1, overflowY: 'auto', textAlign: 'left', border: '1px solid #ccc', padding: 8, borderRadius: 4 }}>
                    <pre>{JSON.stringify(props.variables, undefined, ' ')}</pre>
                </div>
                <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                <div style={{ textAlign: 'right' }}>
                    <Button variant={"outline-danger"} onClick={() => props.closeModal()} style={{ position: 'sticky', bottom: 0 }}>
                        Close
                    </Button>
                </div>
            </Container>
        </Panel>
    )
}

const JSONViewComponent = (props: {closeModal: any, getBehaviorGraph: any}) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async () => {
        const jsonString = JSON.stringify(props.getBehaviorGraph(), undefined, '\t');
        await navigator.clipboard.writeText(jsonString);

        setCopied(true)
        setTimeout(() => {
            setCopied(false);
        }, 2000); // Reset the copied state after 2 seconds
    };

    return (
        <Panel id={"show-json-view-panel"} position={"top-center"} style={{border:"1px solid gray", background: "white"}}>
            <Container style={{padding: 16}}>
                <h3>JSON View</h3>
                <pre style={{textAlign: "left", overflow:"scroll", height: 400, width: 400}}>{JSON.stringify(props.getBehaviorGraph(), undefined, ' ')}</pre>
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

const AddVariableComponent = (props: {closeModal: any, pushVariable: any}) => {
    const idRef = useRef<HTMLInputElement>(null);
    const initialValueRef = useRef<HTMLInputElement>(null);
    const typeRef = useRef<HTMLSelectElement>(null);

    const addVariable = () => {
        if (idRef.current === null || initialValueRef.current === null || typeRef.current === null) {return}
        if (idRef.current.value === "" || initialValueRef.current.value === "" || typeRef.current.value === "") {return}

        const variable: IVariable = {id: idRef.current.value, value: initialValueRef.current.value, type: typeRef.current.selectedIndex};
        props.pushVariable(variable);
        props.closeModal();
    }

    const getTypeNameFromType = (type: any) => {
        if (type.signature === "custom" && type.extensions) {
            return Object.keys(type.extensions)[0]
        } else {
            return type.signature;
        }
    }

    return (
        <Panel id={"create-variable-panel"} position={"top-center"} style={{border:"1px solid gray", background: "white"}}>
            <Container style={{padding: 16}}>
                <h3>Add Variable</h3>
                <Row style={{textAlign: "left"}}>
                    <Col md={12}>
                        <Form.Group>
                            <Form.Label>ID</Form.Label>
                            <Form.Control ref={idRef} type="text" />
                        </Form.Group>
                    </Col>
                    <Col md={12}>
                        <Form.Group>
                            <Form.Label>Initial Value</Form.Label>
                            <Form.Control ref={initialValueRef} type="text" />
                        </Form.Group>
                    </Col>
                    <Col md={12}>
                        <Form.Control ref={typeRef} as="select">
                            {standardTypes.map((option, index) => (
                                <option key={index}>{getTypeNameFromType(option)}</option>
                            ))}
                        </Form.Control>
                    </Col>
                </Row>
                <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                <Row style={{ marginTop: 16 }}>
                    <Col xs={12} md={6}>
                        <Button variant={"outline-primary"} style={{width: "100%"}} id="add-variable-btn" onClick={() => addVariable()}>
                            Add
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

const ShowCustomEventComponent = (props: {closeModal: any, events: any}) => {
    return (
        <Panel id={"show-custom-event-panel"} position={"top-center"} style={{border:"1px solid gray", background: "white", height: 500}}>
            <Container style={{padding: 16, flex: 1, display: 'flex', flexDirection: 'column', height: 500}}>
                <h3>Custom Events</h3>
                <div style={{ flex: 1, overflowY: 'auto', textAlign: 'left', border: '1px solid #ccc', padding: 8, borderRadius: 4 }}>
                    <pre>{JSON.stringify(props.events, undefined, ' ')}</pre>
                </div>
                <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
             <div style={{ textAlign: 'right' }}>
                 <Button variant={"outline-danger"} onClick={() => props.closeModal()} style={{ position: 'sticky', bottom: 0 }}>
                     Close
                 </Button>
             </div>
            </Container>
        </Panel>
    )
}

const AddCustomEventComponent = (props: {closeModal: any, pushCustomEvent: any}) => {
    const idRef = useRef<HTMLInputElement>(null);
    const {array: values, push: pushValue, remove: removeValue, set: setValue} = useArray([]);

    const handleInputChange = (index: number, updatedValue: any) => {
        setValue(index, updatedValue)
    }

    const addCustomEvent = () => {
        if (idRef.current === null || idRef.current.value === "") {return}

        const customEvent: ICustomEvent = {id: idRef.current!.value, values: values}
        props.pushCustomEvent(customEvent);
        props.closeModal();
    }

    const getTypeNameFromType = (type: any) => {
        if (type.signature === "custom" && type.extensions) {
            return Object.keys(type.extensions)[0]
        } else {
            return type.signature;
        }
    }

    return (
        <Panel id={"create-custom-event-panel"} position={"top-center"} style={{border:"1px solid gray", background: "white"}}>
            <Container style={{padding: 16}}>
                <h3>Add Custom Event</h3>
                <Form style={{textAlign: "left"}}>
                    <Form.Group>
                        <Form.Label>ID</Form.Label>
                        <Form.Control ref={idRef} type="text" />
                    </Form.Group>
                    <h4>Values</h4>
                    {values.map((val, index) => (
                        <Row key={index} style={{marginTop: 16}}>
                            <Col>
                                <Form.Control
                                    type="text"
                                    value={val.id}
                                    placeholder="Value ID"
                                    onChange={(e) => handleInputChange(index, {...val, id: e.target.value})}
                                />
                            </Col>
                            <Col>
                                <Form.Control as="select"
                                              onChange={(e) => {
                                                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                                  // @ts-ignore
                                                  const selectedIndex = e.target.selectedIndex;
                                                  handleInputChange(index, { ...val, type: selectedIndex });
                                              }}
                                >
                                    {standardTypes.map((option, typeIndex) => (
                                        <option key={typeIndex}>{getTypeNameFromType(option)}</option>
                                    ))}
                                </Form.Control>
                            </Col>
                            <Col xs="auto">
                                <Button variant="outline-danger" onClick={() => removeValue(index)}>
                                    Remove
                                </Button>
                            </Col>
                        </Row>
                    ))}
                    <Button variant="outline-secondary" onClick={() => pushValue({id: '', type: 0, description: ''})} style={{marginTop: 16}}>
                        Add Value
                    </Button>
                </Form>
                <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                <Row style={{ marginTop: 16 }}>
                    <Col xs={12} md={6}>
                        <Button variant={"outline-primary"} style={{width: "100%"}} id="add-variable-btn" onClick={() => addCustomEvent()}>
                            Add
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

const UploadGraphComponent = (props: { setBehaveGraph: any, closeModal: any}) => {
    const graphRef = useRef<HTMLTextAreaElement>(null);

    const uploadGraph = () => {
        if (graphRef.current === null || graphRef.current.value === "") {return}

        props.setBehaveGraph(graphRef.current.value);
        props.closeModal();
    }

    return (
        <Panel id={"upload-graph-panel"} position={"top-center"} style={{border:"1px solid gray", background: "white"}}>
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
