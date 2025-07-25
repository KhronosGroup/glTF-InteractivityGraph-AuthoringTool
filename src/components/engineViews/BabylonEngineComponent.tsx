import React, {useEffect, useRef, useState, useContext} from "react";
import {Button, Col, Container, Form, Modal, Row, Tab, Tabs} from "react-bootstrap";
import {
    AbstractMesh,
    AnimationGroup,
    ArcRotateCamera,
    DirectionalLight,
    Engine,
    HemisphericLight, Material,
    Mesh,
    Node,
    SceneLoader,
    TransformNode,
    Vector3
} from "@babylonjs/core";
import {Scene} from "@babylonjs/core/scene";
import "@babylonjs/loaders/glTF";
import {Spacer} from "../Spacer";
import {KHR_interactivity, KHR_INTERACTIVITY_EXTENSION_NAME} from "../../loaderExtensions/KHR_interactivity";
import {GLTFLoader} from "@babylonjs/loaders/glTF/2.0";
import {BabylonDecorator} from "../../BasicBehaveEngine/decorators/BabylonDecorator";
import {BasicBehaveEngine} from "../../BasicBehaveEngine/BasicBehaveEngine";
import {GLTFFileLoader, GLTFLoaderAnimationStartMode} from "@babylonjs/loaders";
import { InteractivityGraphContext } from "../../InteractivityGraphContext";
import { DOMEventBus } from "../../BasicBehaveEngine/eventBuses/DOMEventBus";

enum BabylonEngineModal {
    CUSTOM_EVENT = "CUSTOM_EVENT",
    NONE = "NONE"
}

GLTFLoader.RegisterExtension(KHR_INTERACTIVITY_EXTENSION_NAME, (loader) => {
    return new KHR_interactivity(loader);
});



export const BabylonEngineComponent = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<Engine | null>(null);
    const sceneRef = useRef<Scene>();
    const [activeKey, setActiveKey] = useState("1");
    const [graphRunning, setGraphRunning] = useState(false);
    const [openModal, setOpenModal] = useState<BabylonEngineModal>(BabylonEngineModal.NONE);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const babylonEngineRef = useRef<BabylonDecorator | null>(null)
    const [fileUploaded, setFileUploaded] = useState<string | null>(null);
    const [clickedHotSpot, setClickedHotSpot] = useState<string | null>(null);

    const {getExecutableGraph, loadGraphFromJson} = useContext(InteractivityGraphContext);

    useEffect(() => {
        // Create the Babylon.js engines
        engineRef.current = new Engine(canvasRef.current, true);

        createScene();

        // Run the render loop
        engineRef.current?.runRenderLoop(() => {
            sceneRef.current?.render();
        });

        return () => {
            // Clean up resources when the component unmounts
            sceneRef.current?.dispose();
            engineRef.current?.dispose();
            babylonEngineRef.current?.clearCustomEventListeners();
        };
    }, []);

    useEffect(() => {
        if (fileUploaded !== null) {
            play(true)
        }
    }, [fileUploaded])

    const play = (shouldOverrideGraph: boolean) => {
        resetScene()
            .then((res: {nodes: Node[], materials: Material[], animations: AnimationGroup[], meshes: AbstractMesh[]}) => {
                runGraph(babylonEngineRef, getExecutableGraph(), sceneRef.current, res.nodes, res.materials, res.animations, res.meshes, shouldOverrideGraph);
                setGraphRunning(true);
            })
    }

    const createScene = () => {
        // Create a scene
        sceneRef.current = new Scene(engineRef.current!);
        sceneRef.current?.createDefaultCamera(true, true, true);

        canvasRef.current!.addEventListener("wheel", (e: any) => {
            e.preventDefault();
            e.stopPropagation();

            return false;
        })

        // Create lights
        new HemisphericLight('light1', new Vector3(0, 1, 0), sceneRef.current);
        new DirectionalLight('light2', new Vector3(1, -1, 0), sceneRef.current);
    };

    const resetScene = async () => {
        sceneRef.current?.dispose();
        createScene();

        const file = fileInputRef.current!.files![0]

        const url = URL.createObjectURL(file);

        SceneLoader.OnPluginActivatedObservable.add( (loader) => {
            if (loader.name === "gltf") {
                ( loader as GLTFFileLoader ).animationStartMode = GLTFLoaderAnimationStartMode.NONE;
            }
        });
        const container = await SceneLoader.LoadAssetContainerAsync("", url, sceneRef.current, undefined, ".glb");
        container.addAllToScene();

        sceneRef.current?.createDefaultCamera(true, true, true);

        //TODO: the true meshes of glTF are not the ones babylon exposes as objects (these are instantiated node meshes) we should find a way to pass the mesh itself and not the instantiation via a node
        // or else we have cases where two nodes refere to the single mesh => we will have 2 meshes where really we only truly have one in glTF
        return {
            nodes: buildGlTFNodeLayout(container.rootNodes[0]), 
            animations: container.animationGroups, 
            materials: container.materials,
            meshes: container.meshes,
        };
    };

    const buildGlTFNodeLayout = (rootNode: Node): Node[] => {
        const pattern = /^\/nodes\/\d+$/;
        const finalNodes: TransformNode[] = [];
        const seenNodeIndices:Set<number> = new Set<number>();

        function traverse(node: TransformNode) {
            node.metadata.nodePointer = node._internalMetadata.gltf.pointers.find((pointer: string) => pattern.test(pointer));
            if (node.metadata.nodePointer != null) {
                const nodeIndex = Number(node.metadata.nodePointer.split('/')[2]);
                if (!seenNodeIndices.has(nodeIndex)) {
                    seenNodeIndices.add(nodeIndex);
                    node.metadata.nodeIndex = nodeIndex;
                    finalNodes.push(node);
                }
            }

            if (node.getChildTransformNodes()) {
                for (const childNode of node.getChildTransformNodes()) {
                    traverse(childNode);
                }
            }
        }

        rootNode.getChildren<TransformNode>().forEach((child: TransformNode) => traverse(child));

        finalNodes.sort((a, b) => a.metadata.nodeIndex - b.metadata.nodeIndex);
        return finalNodes;
    }

    const runGraph = (babylonEngineRef: any, behaveGraph: any, scene: any, nodes: Node[], materials: Material[], animations: AnimationGroup[], meshes: AbstractMesh[], shouldOverride: boolean) => {
        if (babylonEngineRef.current !== null) {
            babylonEngineRef.current.clearCustomEventListeners()
        }

        const world = {glTFNodes: nodes, animations: animations, materials: materials, meshes: meshes};
        const eventBus = new DOMEventBus();
        babylonEngineRef.current = new BabylonDecorator(new BasicBehaveEngine(60, eventBus), world, scene)

        const extractedBehaveGraph = babylonEngineRef.current.extractBehaveGraphFromScene()
        if ((!behaveGraph.nodes || behaveGraph.nodes.length === 0 || shouldOverride) && extractedBehaveGraph) {
            loadGraphFromJson(extractedBehaveGraph);
            babylonEngineRef.current.loadBehaveGraph(getExecutableGraph());
        } else {
            babylonEngineRef.current.loadBehaveGraph(behaveGraph);
        }
    }

    const exportKHRInteractivityGLB = async () => {
        const file = fileInputRef.current!.files![0];
        const reader = new FileReader();

        reader.onload = function (e) {
            const arrayBuffer = e.target!.result;
            const dataView = new DataView(arrayBuffer as ArrayBuffer);

            // Read bytes 12 to 16 as a little-endian number
            const glTFLengthOriginal = dataView.getUint32(12, true); // true for little-endian

            // Read bytes 20 to (20 + littleEndianNumber) as a JSON string
            const glTFBytes = new Uint8Array(arrayBuffer as ArrayBuffer, 20, glTFLengthOriginal);
            const glTFString = new TextDecoder().decode(glTFBytes);

            // Parse the JSON string
            const glTF = JSON.parse(glTFString);

            glTF['extensions'] = glTF['extensions'] || {};
            glTF['extensions']['KHR_interactivity'] = {
                graphs: [getExecutableGraph()],
                graph: 0

            }
            glTF['extensionsUsed'] = glTF['extensionsUsed'] || []
            if (!glTF['extensionsUsed'].includes('KHR_interactivity')) {
                glTF['extensionsUsed'].push('KHR_interactivity');
            }

            let glTFOutStr = JSON.stringify(glTF);
            while (new TextEncoder().encode(glTFOutStr).length % 4 !== 0) {
                glTFOutStr += " ";
            }
            const glTFLengthNew = new TextEncoder().encode(glTFOutStr).length;
            const glbSizeOriginal = dataView.getUint32(8, true); // true for little-endian
            const byteIncreaseAmount = glTFLengthNew - glTFLengthOriginal;

            const binaryData = new Uint32Array((glbSizeOriginal + byteIncreaseAmount)/4);
            const glbView = new DataView(binaryData.buffer);

            glbView.setUint32(0, 0x46546C67, true);
            glbView.setUint32(4, 0x00000002, true);
            glbView.setUint32(8, glbSizeOriginal + byteIncreaseAmount, true);

            glbView.setUint32(12, glTFLengthNew, true);
            glbView.setUint32(16, 0x4E4F534A, true);
            const glTFOutStringBytes = new TextEncoder().encode(glTFOutStr);
            for (let i = 0; i < glTFOutStringBytes.length; i++) {
                glbView.setUint8(20 + i, glTFOutStringBytes[i]);
            }

            for (let i = glTFLengthOriginal + 20; i < dataView.byteLength; i += 4) {
                glbView.setUint32(i + byteIncreaseAmount, dataView.getUint32(i, true), true);
            }

            const blob = new Blob([binaryData], { type: 'application/octet-stream' });

            const blobUrl = URL.createObjectURL(blob);

            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;
            downloadLink.download = 'interactive.glb';

            downloadLink.click();

            URL.revokeObjectURL(blobUrl); // Clean up after download
        };

        // Start reading the file
        reader.readAsArrayBuffer(file);
    }

    const autoFrame = () => {
        function computeSceneBoundingBox(scene: Scene) {
            let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
            let max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
        
            scene.meshes.forEach((mesh: AbstractMesh) => {
                if (mesh instanceof Mesh && mesh.isVisible) {
                    mesh.computeWorldMatrix(true);
                    const boundingInfo = mesh.getBoundingInfo();
                    const minBox = boundingInfo.boundingBox.minimumWorld;
                    const maxBox = boundingInfo.boundingBox.maximumWorld;
        
                    min = Vector3.Minimize(min, minBox);
                    max = Vector3.Maximize(max, maxBox);
                }
            });
        
            return { min, max, center: min.add(max).scale(0.5) };
        }

        const { min, max, center } = computeSceneBoundingBox(sceneRef.current!);

        const size = max.subtract(min);
        const maxDimension = Math.max(size.x, size.y, size.z);
        const distance = maxDimension * 2.5; 


        const camera = sceneRef.current!.activeCamera as ArcRotateCamera;
        camera.target = center;
        camera.setPosition(new Vector3(center.x, center.y + maxDimension * 0.5, center.z + distance));
        camera.radius = distance;
    }

    return (
        <div style={{width: "90vw", margin: "0 auto"}}>
            <div style={{background: "#3d5987", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16}}>
                <Button variant="outline-light" onClick={() => {
                    play(false)
                }} disabled={fileUploaded == null}>
                    Play
                </Button>

                <Spacer width={16} height={0}/>

                <Button variant="outline-light" onClick={() => setOpenModal(BabylonEngineModal.CUSTOM_EVENT)} disabled={!graphRunning}>
                    Send Custom Event
                </Button>

                <Spacer width={16} height={0}/>

                <label className="mx-3" style={{color: "white"}}>Choose file: </label>
                <input className="d-none" type="file" accept=".glb" ref={fileInputRef} data-testid={"babylon-engine-file-input"} onChange={() => {
                    if (fileInputRef.current == null || fileInputRef.current.files == null || fileInputRef.current.files.length == 0) {
                        setFileUploaded(null);
                        return;
                    }
                    setFileUploaded(fileInputRef.current.files[0].name)
                }}/>
                <Button variant="outline-light" onClick={() => fileInputRef.current!.click()}>
                    Upload glb
                </Button>

                <Spacer width={16} height={0}/>

                <Button variant="outline-light" disabled={fileUploaded == null} onClick={() => exportKHRInteractivityGLB()}>
                    Download glb
                </Button>
                <Button data-testid={"frame-btn"} hidden={true} onClick={() => autoFrame()}>Auto Frame</Button>
            </div>

            <canvas ref={canvasRef} style={{ width: '100%', height: '700px' }} data-testid={"babylon-engine-canvas"} />

            <Modal show={openModal === BabylonEngineModal.CUSTOM_EVENT}>
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
                                            babylonEngineRef.current?.dispatchCustomEvent(`KHR_INTERACTIVITY:${customEvent.id}`, payload)
                                            setOpenModal(BabylonEngineModal.NONE);
                                        }}>Send</Button>
                                    </Row>
                                </Tab>
                            )
                        })}
                    </Tabs>
                    <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                    <Row style={{ marginTop: 16 }}>
                        <Col xs={12} md={12}>
                            <Button variant={"outline-danger"} style={{width: "100%"}} onClick={() => setOpenModal(BabylonEngineModal.NONE)}>
                                Cancel
                            </Button>
                        </Col>
                    </Row>
                </Container>
            </Modal>

            <Modal show={clickedHotSpot !== null} onHide={() => setClickedHotSpot(null)}>
                <Modal.Header closeButton>
                    <Modal.Title>My Hotspot</Modal.Title>
                </Modal.Header>
                <Modal.Body>{clickedHotSpot}</Modal.Body>
            </Modal>
        </div>
    )
}