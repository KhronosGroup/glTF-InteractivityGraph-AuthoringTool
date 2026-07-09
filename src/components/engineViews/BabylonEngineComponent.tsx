import React, {useEffect, useRef, useState, useContext} from "react";
import {Button, Container, Modal} from "react-bootstrap";
import {
    AbstractMesh,
    AnimationGroup,
    ArcRotateCamera,
    DirectionalLight,
    FramingBehavior,
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
import {BabylonDecorator} from "../../decorators/BabylonDecorator";
import {BasicBehaveEngine} from "../../BasicBehaveEngine/BasicBehaveEngine";
import {GLTFFileLoader, GLTFLoaderAnimationStartMode} from "@babylonjs/loaders";
import { InteractivityGraphContext } from "../../InteractivityGraphContext";
import { DOMEventBus } from "../../BasicBehaveEngine/eventBuses/DOMEventBus";
import { attachPointerEventLogging, SendCustomEventPanel } from "../../authoring/CustomEventControls";
import { computeExtensionDiagnostics } from "../../diagnostics";
import { buildNormalizedTemplateSet } from "../../authoring/pointerCatalogue";

enum BabylonEngineModal {
    CUSTOM_EVENT = "CUSTOM_EVENT",
    NONE = "NONE"
}

GLTFLoader.RegisterExtension(KHR_INTERACTIVITY_EXTENSION_NAME, (loader) => {
    return new KHR_interactivity(loader);
});

interface BabylonEngineComponentProps {
    modelUrl?: string | null;
}

export const BabylonEngineComponent: React.FC<BabylonEngineComponentProps> = ({ modelUrl }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<Engine | null>(null);
    const sceneRef = useRef<Scene>();
    const [graphRunning, setGraphRunning] = useState(false);
    const [openModal, setOpenModal] = useState<BabylonEngineModal>(BabylonEngineModal.NONE);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const babylonEngineRef = useRef<BabylonDecorator | null>(null)
    const [fileUploaded, setFileUploaded] = useState<string | null>(null);
    const [clickedHotSpot, setClickedHotSpot] = useState<string | null>(null);
    // Tracks whether the most recent model selection was a local file upload (vs. a modelUrl
    // sample/URL). modelUrl stays set in state/URL after a sample load, so resetScene needs this
    // to know which source should win the next time it (re)loads.
    const [useUploadedFile, setUseUploadedFile] = useState(false);

    const {getExecutableGraph, loadGraphFromJson, setDiagnosticsForCategory, setGltfObjectModel, setSupportedPointerTemplates, clearGraphDirty, registerPlayHandler} = useContext(InteractivityGraphContext);

    // Inspect the loaded glb's declared extensions (stashed on the scene metadata by the
    // KHR_interactivity loader extension) and surface any this tool does not support. Also publish
    // the addressable-object snapshot for the ref-value picker.
    const reportGlbExtensionDiagnostics = () => {
        const metadata = sceneRef.current?.metadata;
        setDiagnosticsForCategory(
            "extension",
            computeExtensionDiagnostics(metadata?.gltfExtensionsUsed, metadata?.gltfExtensionsRequired)
        );
        if (metadata?.gltfObjectModel) {
            setGltfObjectModel(metadata.gltfObjectModel);
        }
    };

    useEffect(() => {
        // Create the Babylon.js engines
        engineRef.current = new Engine(canvasRef.current, true);

        createScene();

        // Blocks page-scroll while over the canvas. Registered once here (not in createScene,
        // which re-runs on every Play/reset) so it doesn't stack up duplicate listeners.
        const blockWheelPropagation = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };
        canvasRef.current!.addEventListener("wheel", blockWheelPropagation);

        // Run the render loop
        engineRef.current?.runRenderLoop(() => {
            sceneRef.current?.render();
        });

        return () => {
            // Clean up resources when the component unmounts
            canvasRef.current?.removeEventListener("wheel", blockWheelPropagation);
            sceneRef.current?.dispose();
            engineRef.current?.dispose();
            babylonEngineRef.current?.dispose();
            setSupportedPointerTemplates(null);
        };
    }, []);

    useEffect(() => {
        if (modelUrl && engineRef.current) {
            setUseUploadedFile(false);
            loadModelFromUrl(modelUrl);
        }
    }, [modelUrl]);

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
                clearGraphDirty();
            })
    }

    // let the authoring menu bar's Reload button trigger this engine's Play without a direct
    // component reference (see registerPlayHandler on InteractivityGraphContext). `play` is
    // redefined every render (it closes over the current `graph` reference, which changes
    // identity on a fresh load), so the registered handler is a stable trampoline through a ref
    // rather than the closure captured by the mount-only effect below.
    const playRef = useRef(play);
    playRef.current = play;
    useEffect(() => {
        registerPlayHandler(() => playRef.current(false));
        return () => registerPlayHandler(null);
    }, []);

    const setupCamera = () => {
        const camera = sceneRef.current!.activeCamera as ArcRotateCamera;
        // Enable camera's behaviors
        camera.useFramingBehavior = true;

        const framingBehavior = camera.getBehaviorByName("Framing") as FramingBehavior;
        framingBehavior.framingTime = 0;
        framingBehavior.elevationReturnTime = -1;

        camera.pinchPrecision = 200 / camera.radius;
        camera.upperRadiusLimit = 5 * camera.radius;

        camera.wheelDeltaPercentage = 0.01;
        camera.pinchDeltaPercentage = 0.01;
    }

    const createScene = () => {
        // Create a scene
        sceneRef.current = new Scene(engineRef.current!);
        sceneRef.current?.createDefaultCamera(true, true, true);
        setupCamera();
        // Create lights
        new HemisphericLight('light1', new Vector3(0, 1, 0), sceneRef.current);
        new DirectionalLight('light2', new Vector3(1, -1, 0), sceneRef.current);
    };

    const resetScene = async () => {
        sceneRef.current?.dispose();
        createScene();

        let url: string;
        if (useUploadedFile && fileInputRef.current?.files?.[0]) {
            url = URL.createObjectURL(fileInputRef.current.files[0]);
        } else if (modelUrl) {
            url = modelUrl;
        } else if (fileInputRef.current?.files?.[0]) {
            url = URL.createObjectURL(fileInputRef.current.files[0]);
        } else {
            console.warn("No model URL or file provided for Babylon engine");
            return { nodes: [], animations: [], materials: [], meshes: [] };
        }

        SceneLoader.OnPluginActivatedObservable.add( (loader) => {
            if (loader.name === "gltf") {
                ( loader as GLTFFileLoader ).animationStartMode = GLTFLoaderAnimationStartMode.NONE;
            }
        });
        const container = await SceneLoader.LoadAssetContainerAsync("", url, sceneRef.current, undefined, ".glb");
        container.addAllToScene();
        reportGlbExtensionDiagnostics();

        sceneRef.current?.createDefaultCamera(true, true, true);
        // Sort materials by _internalMetadata.gltf.pointer
        container.materials = container.materials.filter(mat => mat._internalMetadata?.gltf?.pointers !== undefined)
        container.materials = container.materials.sort((a, b) => {
            const aPointer = a._internalMetadata?.gltf?.pointers?.[0] ?? "";
            const bPointer = b._internalMetadata?.gltf?.pointers?.[0] ?? "";
            const aIndex = Number(aPointer.split('/')[2]);
            const bIndex = Number(bPointer.split('/')[2]);
            if (aIndex < bIndex) return -1;
            if (aIndex > bIndex) return 1;
            return 0;
        });
        console.log(container.materials);
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
            babylonEngineRef.current.dispose()
        }

        const world = {glTFNodes: nodes, animations: animations, materials: materials, meshes: meshes.filter(m => m.subMeshes !== undefined)};
        const eventBus = new DOMEventBus();
        babylonEngineRef.current = new BabylonDecorator(new BasicBehaveEngine(60, eventBus), world, scene)
        const runtimeTemplates = buildNormalizedTemplateSet(babylonEngineRef.current.getRegisteredJsonPointers());
        setSupportedPointerTemplates(runtimeTemplates);
        attachPointerEventLogging(babylonEngineRef.current);

        const extractedBehaveGraph = babylonEngineRef.current.extractBehaveGraphFromScene()
        try {
            if ((!behaveGraph.nodes || behaveGraph.nodes.length === 0 || shouldOverride) && extractedBehaveGraph) {
                loadGraphFromJson(JSON.parse(JSON.stringify(extractedBehaveGraph)));
                babylonEngineRef.current.loadBehaveGraph(extractedBehaveGraph);
            } else {
                babylonEngineRef.current.loadBehaveGraph(behaveGraph);
            }
        } catch (error) {
            console.warn("KHR_interactivity graph execution stopped", error);
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

    const loadModelFromUrl = async (url: string) => {
        try {
            // Create a scene if it doesn't exist
            if (!sceneRef.current) {
                createScene();
            }
            
            SceneLoader.OnPluginActivatedObservable.add((loader) => {
                if (loader.name === "gltf") {
                    (loader as GLTFFileLoader).animationStartMode = GLTFLoaderAnimationStartMode.NONE;
                }
            });
            
            const container = await SceneLoader.LoadAssetContainerAsync("", url, sceneRef.current, undefined, ".glb");
            container.addAllToScene();
            reportGlbExtensionDiagnostics();

            sceneRef.current?.createDefaultCamera(true, true, true);

            const worldInfo = {
                glTFNodes: buildGlTFNodeLayout(container.rootNodes[0]), 
                animations: container.animationGroups, 
                materials: container.materials,
                meshes: container.meshes,
            };
            
            // Update the file uploaded state to enable play button
            setFileUploaded(url.split('/').pop() || "model.glb");
            
            // Setup the engine with the loaded model. This reuses the existing scene (unlike
            // resetScene/Play, which disposes it), so the previous decorator's observers must be
            // torn down explicitly or they'd stack up on every model load.
            babylonEngineRef.current?.dispose();
            const eventBus = new DOMEventBus();
            babylonEngineRef.current = new BabylonDecorator(new BasicBehaveEngine(60, eventBus), worldInfo, sceneRef.current!);
            attachPointerEventLogging(babylonEngineRef.current);

            const extractedBehaveGraph = babylonEngineRef.current.extractBehaveGraphFromScene();
            if (extractedBehaveGraph) {
                loadGraphFromJson(JSON.parse(JSON.stringify(extractedBehaveGraph)));
                babylonEngineRef.current.loadBehaveGraph(extractedBehaveGraph);
            } else {
                babylonEngineRef.current.loadBehaveGraph(getExecutableGraph());
            }
            clearGraphDirty();
        } catch (error) {
            console.error("Error loading model from URL:", error);
        }
    };

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
                    setUseUploadedFile(true);
                    setFileUploaded(fileInputRef.current.files[0].name)
                }}/>
                <Button variant="outline-light" onClick={() => fileInputRef.current!.click()}>
                    Upload glb
                </Button>

                <Spacer width={16} height={0}/>

                <Button variant="outline-light" disabled={fileUploaded == null} onClick={() => exportKHRInteractivityGLB()}>
                    Download glb
                </Button>
                <Spacer width={16} height={0}/>
                <Button data-testid={"frame-btn"} variant="outline-light" onClick={() => autoFrame()}>
                    Auto Frame
                </Button>
            </div>

            <canvas ref={canvasRef} style={{ width: '100%', height: '700px' }} data-testid={"babylon-engine-canvas"} />

            <Modal size="lg" show={openModal === BabylonEngineModal.CUSTOM_EVENT} onHide={() => setOpenModal(BabylonEngineModal.NONE)}>
                <Container style={{padding: 16}}>
                    <h3>Send Custom Event</h3>
                    <SendCustomEventPanel graph={getExecutableGraph()} />
                    <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                    <Button variant={"outline-secondary"} style={{width: "100%"}} onClick={() => setOpenModal(BabylonEngineModal.NONE)}>
                        Close
                    </Button>
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
