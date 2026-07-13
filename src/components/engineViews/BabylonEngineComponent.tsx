import React, {useEffect, useRef, useState, useContext} from "react";
import {Button, Container, Modal} from "react-bootstrap";
import {
    AbstractMesh,
    ArcRotateCamera,
    DirectionalLight,
    FramingBehavior,
    Engine,
    HemisphericLight,
    Mesh,
    SceneLoader,
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
import { loadSelectedModelGraph } from "./modelGraphExecution";
import { BabylonLoadedModel, buildBabylonDecoratorWorld, buildBabylonLoadedModel } from "./babylonLoadedModel";
import { downloadInteractivityGlb } from "./glbExport";

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
        const resizeEngine = () => {
            engineRef.current?.resize();
        };

        // Ensure the initial back-buffer matches the displayed canvas size.
        resizeEngine();

        window.addEventListener("resize", resizeEngine);

        let observer: ResizeObserver | null = null;
        if (canvasRef.current && typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(() => resizeEngine());
            observer.observe(canvasRef.current);
        }

        return () => {
            window.removeEventListener("resize", resizeEngine);
            observer?.disconnect();
        };
    }, []);

    useEffect(() => {
        if (modelUrl && engineRef.current) {
            setUseUploadedFile(false);
            loadModelFromUrl(modelUrl);
        }
    }, [modelUrl]);

    useEffect(() => {
        if (fileUploaded !== null && useUploadedFile) {
            play(true)
        }
    }, [fileUploaded, useUploadedFile])

    const play = (shouldOverrideGraph: boolean) => {
        resetScene()
            .then(async (res: BabylonLoadedModel) => {
                await runGraph(babylonEngineRef, getExecutableGraph(), sceneRef.current, res, shouldOverrideGraph);
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
        const loadedModel = buildBabylonLoadedModel(container);
        console.log(loadedModel.materials);
        return loadedModel;
    };

    const runGraph = async (babylonEngineRef: any, behaveGraph: any, scene: any, loadedModel: BabylonLoadedModel, shouldOverride: boolean) => {
        if (babylonEngineRef.current !== null) {
            babylonEngineRef.current.dispose()
        }

        const world = buildBabylonDecoratorWorld(loadedModel);
        const eventBus = new DOMEventBus();
        babylonEngineRef.current = new BabylonDecorator(new BasicBehaveEngine(60, eventBus), world, scene)
        const runtimeTemplates = buildNormalizedTemplateSet(babylonEngineRef.current.getRegisteredJsonPointers());
        setSupportedPointerTemplates(runtimeTemplates);
        attachPointerEventLogging(babylonEngineRef.current);

        const extractedBehaveGraph = babylonEngineRef.current.extractBehaveGraphFromScene()
        try {
            await loadSelectedModelGraph({
                authoredGraph: behaveGraph,
                embeddedGraph: extractedBehaveGraph,
                replaceAuthoringGraph: shouldOverride,
                loadGraphFromJson,
                loadBehaveGraph: (graph) => babylonEngineRef.current!.loadBehaveGraph(graph),
            });
        } catch (error) {
            console.warn("KHR_interactivity graph execution stopped", error);
        }
    }

    const exportKHRInteractivityGLB = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (file) {
            await downloadInteractivityGlb(file, getExecutableGraph());
        }
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
            // Dispose the previous scene before loading so models don't stack up additively when
            // switching samples (a fresh scene also drops the prior model's meshes/observers).
            sceneRef.current?.dispose();
            createScene();

            SceneLoader.OnPluginActivatedObservable.add((loader) => {
                if (loader.name === "gltf") {
                    (loader as GLTFFileLoader).animationStartMode = GLTFLoaderAnimationStartMode.NONE;
                }
            });
            
            const container = await SceneLoader.LoadAssetContainerAsync("", url, sceneRef.current, undefined, ".glb");
            container.addAllToScene();
            reportGlbExtensionDiagnostics();

            sceneRef.current?.createDefaultCamera(true, true, true);

            const worldInfo = buildBabylonDecoratorWorld(buildBabylonLoadedModel(container));
            
            // Update the file uploaded state to enable play button
            setFileUploaded(url.split('/').pop() || "model.glb");
            
            // Setup the engine with the loaded model. The scene was reset above, but the decorator
            // is not scene-owned, so tear down the previous one explicitly to avoid stacking.
            babylonEngineRef.current?.dispose();
            const eventBus = new DOMEventBus();
            babylonEngineRef.current = new BabylonDecorator(new BasicBehaveEngine(60, eventBus), worldInfo, sceneRef.current!);
            attachPointerEventLogging(babylonEngineRef.current);

            const extractedBehaveGraph = babylonEngineRef.current.extractBehaveGraphFromScene();
            await loadSelectedModelGraph({
                authoredGraph: getExecutableGraph(),
                embeddedGraph: extractedBehaveGraph,
                replaceAuthoringGraph: true,
                loadGraphFromJson,
                loadBehaveGraph: (graph) => babylonEngineRef.current!.loadBehaveGraph(graph),
            });
            clearGraphDirty();
        } catch (error) {
            console.error("Error loading model from URL:", error);
        }
    };

    return (
        <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "column"}}>
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

            <canvas ref={canvasRef} style={{ width: '100%', flex: 1, minHeight: 0 }} data-testid={"babylon-engine-canvas"} />

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
