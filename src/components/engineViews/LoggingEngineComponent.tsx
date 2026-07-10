import React, {useContext, useEffect, useRef, useState} from "react";
import {Button, Col, Container, Form, Modal, Row, Tab, Tabs} from "react-bootstrap";
import {Spacer} from "../Spacer";
import {BasicBehaveEngine} from "../../BasicBehaveEngine/BasicBehaveEngine";
import {LoggingDecorator} from "../../decorators/LoggingDecorator";
import { InteractivityGraphContext } from "../../InteractivityGraphContext";
import { DOMEventBus } from "../../BasicBehaveEngine/eventBuses/DOMEventBus";
import { buildNormalizedTemplateSet } from "../../authoring/pointerCatalogue";
import { createGlTFObjectModelFromGltf, readGlbJsonFromArrayBuffer } from "../../objectModel/glTFObjectModel";

enum LoggingEngineModal {
    OBJECT_MODEL = "OBJECT_MODEL",
    CUSTOM_EVENT = "CUSTOM_EVENT",
    NONE = "NONE"
}

interface LoggingEngineComponentProps {
    modelUrl?: string | null;
}

export const LoggingEngineComponent: React.FC<LoggingEngineComponentProps> = ({ modelUrl }) => {
    const [executionLog, setExecutionLog] = useState("");
    const [openModal, setOpenModal] = useState<LoggingEngineModal>(LoggingEngineModal.NONE);
    const [objectModelJson, setObjectModelJson] = useState("{}");
    const [activeKey, setActiveKey] = useState("1");
    const [graphRunning, setGraphRunning] = useState(false);
    const objectModelInputRef = useRef<HTMLTextAreaElement | null>(null);
    const loggingEngineRef = useRef<LoggingDecorator | null>(null);

    const {getExecutableGraph, setSupportedPointerTemplates, clearGraphDirty, registerPlayHandler} = useContext(InteractivityGraphContext);

    useEffect(() => {
        return () => {
            // Clean up resources when the component unmounts
            loggingEngineRef.current?.dispose();
            setSupportedPointerTemplates(null);
        };
    }, []);

    const play = () => {
        setExecutionLog("");
        runGraph(getExecutableGraph(), setExecutionLog, JSON.parse(objectModelJson));
        setGraphRunning(true);
        clearGraphDirty();
    };

    // let the authoring menu bar's Reload button trigger this engine's Play without a direct
    // component reference (see registerPlayHandler on InteractivityGraphContext). `play` closes
    // over `objectModelJson`/`getExecutableGraph`, which change across renders, so the registered
    // handler is a stable trampoline through a ref rather than the closure captured by this
    // mount-only effect.
    const playRef = useRef(play);
    playRef.current = play;
    useEffect(() => {
        registerPlayHandler(() => playRef.current());
        return () => registerPlayHandler(null);
    }, []);

    // Effect to handle model URL
    useEffect(() => {
        if (!modelUrl) {
            return;
        }

        let isCancelled = false;
        fetch(modelUrl)
            .then((response) => response.arrayBuffer())
            .then((arrayBuffer) => {
                const gltf = readGlbJsonFromArrayBuffer(arrayBuffer);
                const objectModel = createGlTFObjectModelFromGltf(gltf);
                if (isCancelled) {
                    return;
                }

                setObjectModelJson(JSON.stringify(objectModel, null, 2));
                setExecutionLog("");
                runGraph(getExecutableGraph(), setExecutionLog, objectModel);
                setGraphRunning(true);
                clearGraphDirty();
            })
            .catch((error) => {
                if (!isCancelled) {
                    setExecutionLog(`Failed to load object model: ${error instanceof Error ? error.message : String(error)}`);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [modelUrl]);

    const runGraph = (behaveGraph: any, setExecutionLog: any, objectModel: any) => {
        console.log(behaveGraph);
        if (loggingEngineRef.current !== null) {
            loggingEngineRef.current?.dispose()
        }

        const eventBus = new DOMEventBus();
        loggingEngineRef.current = new LoggingDecorator(new BasicBehaveEngine(1, eventBus), (line: string) => setExecutionLog((prev: string) => prev + "\n" + line), objectModel)
        const runtimeTemplates = buildNormalizedTemplateSet(loggingEngineRef.current.getRegisteredJsonPointers());
        setSupportedPointerTemplates(runtimeTemplates);
        loggingEngineRef.current?.loadBehaveGraph(behaveGraph);
    }

    return (
        <div style={{width: "90vw", margin: "0 auto"}}>
            <div style={{background: "#3d5987", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16}}>
                <Button variant="outline-light" data-testid={"logging-engine-play-btn"} onClick={play}>
                    Play
                </Button>
                <Spacer width={16} height={0}/>
                <Button variant="outline-light" onClick={() => setOpenModal(LoggingEngineModal.OBJECT_MODEL)}>
                    Upload object model JSON
                </Button>
                <Spacer width={16} height={0}/>
                <Button variant="outline-light" onClick={() => setOpenModal(LoggingEngineModal.CUSTOM_EVENT)} disabled={!graphRunning}>
                    Send Custom Event
                </Button>
            </div>
            <pre style={{background: "black", color: "white", fontFamily: "monospace", padding: 10, height: 700}} data-testid={"logging-engine-log"}>
                {executionLog}
            </pre>

            <Modal show={openModal === LoggingEngineModal.OBJECT_MODEL}>
                <Container style={{padding: 16}}>
                    <h3>Upload Object Model</h3>
                    <Row style={{textAlign: "left"}}>
                        <Col>
                            <Form.Group>
                                <Form.Label>Object Model JSON</Form.Label>
                                <Form.Control ref={objectModelInputRef} defaultValue={objectModelJson} as="textarea" rows={10} />
                            </Form.Group>
                        </Col>
                    </Row>
                    <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                    <Row style={{ marginTop: 16 }}>
                        <Col xs={12} md={6}>
                            <Button variant={"outline-primary"} id={"upload-graph-btn"} style={{width: "100%"}} onClick={() => {
                                setObjectModelJson(objectModelInputRef.current?.value ?? "{}");
                                setOpenModal(LoggingEngineModal.NONE);
                            }}>Save</Button>
                        </Col>
                        <Col xs={12} md={6}>
                            <Button variant={"outline-danger"} style={{width: "100%"}} onClick={() => setOpenModal(LoggingEngineModal.NONE)}>
                                Cancel
                            </Button>
                        </Col>
                    </Row>
                </Container>
            </Modal>

            <Modal show={openModal === LoggingEngineModal.CUSTOM_EVENT}>
                <Container style={{padding: 16}}>
                    <h3>Send Custom Event</h3>
                    <Tabs
                        activeKey={activeKey}
                        onSelect={(key: any) => setActiveKey(key)}
                    >
                        {getExecutableGraph().events?.map((customEvent: any, index: number) => {
                            return (
                                <Tab title={customEvent.id} eventKey={index + 1}>
                                    <Row style={{textAlign: "left"}}>
                                        {Object.keys(customEvent.values).map((val: any) => {
                                            return (
                                                <Col md={12}>
                                                    <Form.Group>
                                                        <Form.Label>{val}</Form.Label>
                                                        <Form.Control id={val} type="text"/>
                                                    </Form.Group>
                                                </Col>
                                            )
                                        })}
                                        <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                                        <Button variant={"outline-primary"} onClick={() => {
                                            const payload: any = {};
                                            for (const val of Object.keys(customEvent.values)) {
                                                payload[val] = (document.getElementById(val) as HTMLInputElement).value;
                                            }
                                            loggingEngineRef.current?.dispatchCustomEvent(`KHR_INTERACTIVITY:${customEvent.id}`, payload)
                                            setOpenModal(LoggingEngineModal.NONE);
                                        }}>Send</Button>
                                    </Row>
                                </Tab>
                            )
                        })}
                    </Tabs>
                    <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                    <Row style={{ marginTop: 16 }}>
                        <Col xs={12} md={12}>
                            <Button variant={"outline-danger"} style={{width: "100%"}} onClick={() => setOpenModal(LoggingEngineModal.NONE)}>
                                Cancel
                            </Button>
                        </Col>
                    </Row>
                </Container>
            </Modal>
        </div>
    )
}
