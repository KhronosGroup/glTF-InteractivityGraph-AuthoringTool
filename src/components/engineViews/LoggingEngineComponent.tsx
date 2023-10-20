import React, {useEffect, useRef, useState} from "react";
import {Button, Col, Container, Form, Modal, Row, Tab, Tabs} from "react-bootstrap";
import {Spacer} from "../Spacer";
import {BasicBehaveEngine} from "../../BasicBehaveEngine/BasicBehaveEngine";
import {LoggingDecorator} from "../../BasicBehaveEngine/decorators/LoggingDecorator";

enum LoggingEngineModal {
    WORLD = "WORLD",
    CUSTOM_EVENT = "CUSTOM_EVENT",
    NONE = "NONE"
}
export const LoggingEngineComponent = (props: {behaveGraphRef: any}) => {
    const [executionLog, setExecutionLog] = useState("");
    const [openModal, setOpenModal] = useState<LoggingEngineModal>(LoggingEngineModal.NONE);
    const [world, setWorld] = useState("{}");
    const [activeKey, setActiveKey] = useState("1");
    const [graphRunning, setGraphRunning] = useState(false);
    const worldInputRef = useRef<HTMLTextAreaElement | null>(null);
    const loggingEngineRef = useRef<LoggingDecorator | null>(null)

    useEffect(() => {
        return () => {
            // Clean up resources when the component unmounts
            loggingEngineRef.current?.clearCustomEventListeners();
        };
    }, [])


    const runGraph = (behaveGraph: any, setExecutionLog: any, world: any) => {
        if (loggingEngineRef.current !== null) {
            loggingEngineRef.current?.clearCustomEventListeners()
        }

        loggingEngineRef.current = new LoggingDecorator(new BasicBehaveEngine(1), (line: string) => setExecutionLog((prev: string) => prev + "\n" + line), world)
        loggingEngineRef.current?.loadBehaveGraph(behaveGraph);
    }

    return (
        <div style={{width: "90vw", margin: "0 auto"}}>
            <div style={{background: "#3d5987", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16}}>
                <Button variant="outline-light" onClick={() => {
                    setExecutionLog("");
                    runGraph(props.behaveGraphRef.current, setExecutionLog, JSON.parse(world));
                    setGraphRunning(true);
                }}>
                    Play
                </Button>
                <Spacer width={16} height={0}/>
                <Button variant="outline-light" onClick={() => setOpenModal(LoggingEngineModal.WORLD)}>
                    Upload world JSON
                </Button>
                <Spacer width={16} height={0}/>
                <Button variant="outline-light" onClick={() => setOpenModal(LoggingEngineModal.CUSTOM_EVENT)} disabled={!graphRunning}>
                    Send Custom Event
                </Button>
            </div>
            <pre style={{background: "black", color: "white", fontFamily: "monospace", padding: 10, height: 700}}>
                {executionLog}
            </pre>

            <Modal show={openModal === LoggingEngineModal.WORLD}>
                <Container style={{padding: 16}}>
                    <h3>Upload World</h3>
                    <Row style={{textAlign: "left"}}>
                        <Col>
                            <Form.Group>
                                <Form.Label>World JSON</Form.Label>
                                <Form.Control ref={worldInputRef} defaultValue={world} as="textarea" rows={10} />
                            </Form.Group>
                        </Col>
                    </Row>
                    <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                    <Row style={{ marginTop: 16 }}>
                        <Col xs={12} md={6}>
                            <Button variant={"outline-primary"} id={"upload-graph-btn"} style={{width: "100%"}} onClick={() => {
                                setWorld(worldInputRef.current?.value ?? "{}");
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
                        {props.behaveGraphRef.current.customEvents?.map((customEvent: any, index: number) => {
                            return (
                                <Tab title={customEvent.id} eventKey={index + 1}>
                                    <Row style={{textAlign: "left"}}>
                                        {customEvent.values.map((val: any) => {
                                            return (
                                                <Col md={12}>
                                                    <Form.Group>
                                                        <Form.Label>{val.id}</Form.Label>
                                                        <Form.Control id={val.id} type="text"/>
                                                    </Form.Group>
                                                </Col>
                                            )
                                        })}
                                        <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                                        <Button variant={"outline-primary"} onClick={() => {
                                            const payload: any = {};
                                            for (const val of customEvent.values) {
                                                payload[val.id] = (document.getElementById(val.id) as HTMLInputElement).value;
                                            }
                                            loggingEngineRef.current?.emitCustomEvent(`KHR_INTERACTIVITY:${customEvent.id}`, payload)
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


