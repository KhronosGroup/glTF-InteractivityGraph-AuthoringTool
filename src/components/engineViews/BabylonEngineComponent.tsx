import React, {useEffect, useRef, useState, useContext} from "react";
import {Button, Container, Dropdown, Modal} from "react-bootstrap";
import {
    AbstractMesh,
    ArcRotateCamera,
    Color4,
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
import {registerKHRInteractivityExtension} from "../../loaderExtensions/KHR_interactivity";
import {BabylonDecorator} from "../../decorators/BabylonDecorator";
import {BasicBehaveEngine} from "../../BasicBehaveEngine/BasicBehaveEngine";
import {GLTFFileLoader, GLTFLoaderAnimationStartMode} from "@babylonjs/loaders";
import { InteractivityGraphContext } from "../../InteractivityGraphContext";
import { DOMEventBus } from "../../BasicBehaveEngine/eventBuses/DOMEventBus";
import { attachPointerEventLogging, SendCustomEventPanel } from "../../authoring/CustomEventControls";
import { computeExecutionDiagnostics, computeExtensionDiagnostics } from "../../diagnostics";
import { buildNormalizedTemplateSet } from "../../authoring/pointerCatalogue";
import { loadSelectedModelGraph } from "./modelGraphExecution";
import { attachSkinLoadedMetadata, BabylonLoadedModel, buildBabylonDecoratorWorld, buildBabylonLoadedModel } from "./babylonLoadedModel";
import { downloadInteractiveModel, ModelExportFormat, ModelSource } from "./modelExport";
import { entriesFromDataTransfer, entriesFromFileList, findModelEntry, ModelFileEntry, pluginExtensionForName, pluginExtensionForUrl, registerModelFiles } from "./modelFiles";
import { configureModelNavigation, MODEL_VIEW_Z_DIRECTION } from "./cameraFraming";
import { useDevicePixelRatio } from "../../hooks/useDevicePixelRatio";
import { useFullscreen } from "../../hooks/useFullscreen";
import { IconDownload, IconPlay, IconSendEvent, IconUpload } from "../toolbarIcons";
import { ViewportControls } from "./ViewportControls";

enum BabylonEngineModal {
    CUSTOM_EVENT = "CUSTOM_EVENT",
    NONE = "NONE"
}

/** upper bound for the device-pixel render scale (see the devicePixelRatio effect) */
const MAX_RENDER_SCALE = 2;

registerKHRInteractivityExtension();

interface BabylonEngineComponentProps {
    modelUrl?: string | null;
}

export const BabylonEngineComponent: React.FC<BabylonEngineComponentProps> = ({ modelUrl }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
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
    // the uploaded/dropped model and its companion files (.bin, textures), with relative paths
    const selectedFilesRef = useRef<ModelFileEntry[]>([]);
    // bumped per selection so re-selecting a file with the same name reloads it
    const [uploadRevision, setUploadRevision] = useState(0);
    const [draggingFiles, setDraggingFiles] = useState(false);
    const devicePixelRatio = useDevicePixelRatio();
    const viewportFullscreen = useFullscreen(viewportRef);

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

    // a rejected graph or a runtime error that halts the engine shows up in the diagnostics panel,
    // not only in the console
    const reportExecutionError = (error: unknown) => {
        setDiagnosticsForCategory("execution", computeExecutionDiagnostics(error));
    };
    const attachExecutionDiagnostics = (decorator: BabylonDecorator) => {
        setDiagnosticsForCategory("execution", []);
        decorator.setExecutionErrorListener((error) => {
            console.warn("KHR_interactivity graph execution stopped", error);
            reportExecutionError(error);
        });
    };
    const loadBehaveGraphReportingErrors = (graph: any) => {
        try {
            babylonEngineRef.current!.loadBehaveGraph(graph);
        } catch (error) {
            reportExecutionError(error);
            throw error;
        }
    };

    useEffect(() => {
        // Create the Babylon.js engines. adaptToDeviceRatio (4th arg) makes the very first frame
        // render at the display's native pixels instead of CSS pixels — without it the viewport is
        // visibly soft on any HiDPI screen. The ongoing ratio is owned by the effect below.
        engineRef.current = new Engine(canvasRef.current, true, undefined, true);

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

    // Render at the display's native pixels, capped: on a 4K/200% screen an uncapped ratio means
    // ~4x the fragments for a viewport that is only half the window, which costs more than it
    // visibly gains.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) { return; }
        engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, MAX_RENDER_SCALE));
        engine.resize();
    }, [devicePixelRatio]);

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
    }, [fileUploaded, useUploadedFile, uploadRevision])

    const selectModelFiles = (entries: ModelFileEntry[]) => {
        const model = findModelEntry(entries);
        if (model === undefined) {
            console.warn("No .glb or .gltf among the selected files", entries.map((entry) => entry.path));
            return;
        }
        selectedFilesRef.current = entries;
        setUseUploadedFile(true);
        setFileUploaded(model.file.name);
        setUploadRevision((revision) => revision + 1);
    };

    // files dropped anywhere on the page load like an upload; a folder drop keeps its subfolders
    useEffect(() => {
        let dragDepth = 0;
        const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;
        const onDragEnter = (event: DragEvent) => {
            if (!hasFiles(event)) { return; }
            dragDepth++;
            setDraggingFiles(true);
        };
        const onDragOver = (event: DragEvent) => {
            if (!hasFiles(event)) { return; }
            event.preventDefault();
            event.dataTransfer!.dropEffect = "copy";
        };
        const onDragLeave = (event: DragEvent) => {
            if (!hasFiles(event)) { return; }
            dragDepth = Math.max(0, dragDepth - 1);
            if (dragDepth === 0) { setDraggingFiles(false); }
        };
        const onDrop = (event: DragEvent) => {
            if (!hasFiles(event)) { return; }
            event.preventDefault();
            dragDepth = 0;
            setDraggingFiles(false);
            entriesFromDataTransfer(event.dataTransfer!).then(selectModelFiles, (error) => console.error("Failed to read dropped files:", error));
        };
        window.addEventListener("dragenter", onDragEnter);
        window.addEventListener("dragover", onDragOver);
        window.addEventListener("dragleave", onDragLeave);
        window.addEventListener("drop", onDrop);
        return () => {
            window.removeEventListener("dragenter", onDragEnter);
            window.removeEventListener("dragover", onDragOver);
            window.removeEventListener("dragleave", onDragLeave);
            window.removeEventListener("drop", onDrop);
        };
    }, []);

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

        configureModelNavigation(camera, camera.radius);
    }

    const createScene = () => {
        // Create a scene
        sceneRef.current = new Scene(engineRef.current!);
        sceneRef.current.clearColor = new Color4(1, 1, 1, 1);
        sceneRef.current?.createDefaultCamera(true, true, true);
        setupCamera();
        // Create lights
        new HemisphericLight('light1', new Vector3(0, 1, 0), sceneRef.current);
        new DirectionalLight('light2', new Vector3(1, -1, 0), sceneRef.current);
    };

    const resetScene = async () => {
        sceneRef.current?.dispose();
        createScene();

        const uploadedModel = findModelEntry(selectedFilesRef.current);
        let source: string | ModelFileEntry;
        if (useUploadedFile && uploadedModel) {
            source = uploadedModel;
        } else if (modelUrl) {
            source = modelUrl;
        } else if (uploadedModel) {
            source = uploadedModel;
        } else {
            console.warn("No model URL or file provided for Babylon engine");
            return { nodes: [], animations: [], materials: [], meshes: [] };
        }

        SceneLoader.OnPluginActivatedObservable.add( (loader) => {
            if (loader.name === "gltf") {
                ( loader as GLTFFileLoader ).animationStartMode = GLTFLoaderAnimationStartMode.NONE;
                attachSkinLoadedMetadata(loader as GLTFFileLoader);
            }
        });
        let container;
        if (typeof source === "string") {
            container = await SceneLoader.LoadAssetContainerAsync("", source, sceneRef.current, undefined, pluginExtensionForUrl(source));
        } else {
            // a .gltf resolves its .bin/textures among the other selected files
            registerModelFiles(selectedFilesRef.current, source);
            container = await SceneLoader.LoadAssetContainerAsync("file:", source.file, sceneRef.current, undefined, pluginExtensionForName(source.file.name));
        }
        container.addAllToScene();
        reportGlbExtensionDiagnostics();

        sceneRef.current?.createDefaultCamera(true, true, true);
        autoFrame();
        const loadedModel = buildBabylonLoadedModel(container);
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
        attachExecutionDiagnostics(babylonEngineRef.current);

        const extractedBehaveGraph = babylonEngineRef.current.extractBehaveGraphFromScene()
        try {
            await loadSelectedModelGraph({
                authoredGraph: behaveGraph,
                embeddedGraph: extractedBehaveGraph,
                replaceAuthoringGraph: shouldOverride,
                loadGraphFromJson,
                loadBehaveGraph: loadBehaveGraphReportingErrors,
            });
        } catch (error) {
            console.warn("KHR_interactivity graph execution stopped", error);
        }
    }

    // Mirrors the source resolution in resetScene: whichever glb the viewport currently shows is
    // the one the graph gets embedded into. A sample loaded via modelUrl has no file input entry,
    // so resolving only from fileInputRef made the button a no-op for every sample.
    const currentModelSource = (): ModelSource | null => {
        const entries = selectedFilesRef.current;
        const model = findModelEntry(entries);
        if (useUploadedFile && model) {
            return { kind: "files", model, entries };
        }
        if (modelUrl) {
            return { kind: "url", url: modelUrl };
        }
        return model ? { kind: "files", model, entries } : null;
    };

    const exportInteractiveModel = async (format: ModelExportFormat) => {
        const source = currentModelSource();
        if (source == null) {
            console.warn("No model loaded to export");
            return;
        }
        try {
            await downloadInteractiveModel(source, getExecutableGraph(), format);
        } catch (error) {
            console.error("Failed to export model:", error);
            window.alert(`Export failed: ${error instanceof Error ? error.message : error}`);
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
        camera.setPosition(new Vector3(
            center.x,
            center.y + maxDimension * 0.4,
            center.z + distance * MODEL_VIEW_Z_DIRECTION,
        ));
        camera.radius = distance;
        // loading replaces the camera (createDefaultCamera), so navigation is set up on every frame-in
        configureModelNavigation(camera, maxDimension);
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
                    attachSkinLoadedMetadata(loader as GLTFFileLoader);
                }
            });
            
            const container = await SceneLoader.LoadAssetContainerAsync("", url, sceneRef.current, undefined, pluginExtensionForUrl(url));
            container.addAllToScene();
            reportGlbExtensionDiagnostics();

            sceneRef.current?.createDefaultCamera(true, true, true);
            autoFrame();

            const worldInfo = buildBabylonDecoratorWorld(buildBabylonLoadedModel(container));
            
            // Update the file uploaded state to enable play button
            setFileUploaded(url.split('/').pop() || "model.glb");
            
            // Setup the engine with the loaded model. The scene was reset above, but the decorator
            // is not scene-owned, so tear down the previous one explicitly to avoid stacking.
            babylonEngineRef.current?.dispose();
            const eventBus = new DOMEventBus();
            babylonEngineRef.current = new BabylonDecorator(new BasicBehaveEngine(60, eventBus), worldInfo, sceneRef.current!);
            attachPointerEventLogging(babylonEngineRef.current);
            attachExecutionDiagnostics(babylonEngineRef.current);

            const extractedBehaveGraph = babylonEngineRef.current.extractBehaveGraphFromScene();
            await loadSelectedModelGraph({
                authoredGraph: getExecutableGraph(),
                embeddedGraph: extractedBehaveGraph,
                replaceAuthoringGraph: true,
                loadGraphFromJson,
                loadBehaveGraph: loadBehaveGraphReportingErrors,
            });
            // this path runs the graph just like play() does, so the toolbar (Send Custom Event)
            // has to see it as running too
            setGraphRunning(true);
            clearGraphDirty();
        } catch (error) {
            console.error("Error loading model from URL:", error);
        }
    };

    return (
        <div className={"panel"}>
            <div className={"panel__toolbar"}>
                <button type="button" className="panel__toolbar-btn" onClick={() => play(false)} disabled={fileUploaded == null}>
                    <IconPlay/>
                    Play
                </button>

                <button type="button" className="panel__toolbar-btn" onClick={() => setOpenModal(BabylonEngineModal.CUSTOM_EVENT)} disabled={!graphRunning}>
                    <IconSendEvent/>
                    Send Custom Event
                </button>

                <span className={"panel__toolbar-label"}>Model</span>
                {/* a .gltf is selected together with its .bin and texture files */}
                <input className="d-none" type="file" multiple accept=".glb,.gltf,.bin,image/*" ref={fileInputRef} data-testid={"babylon-engine-file-input"} onChange={(event) => {
                    selectModelFiles(entriesFromFileList(event.target.files));
                    // allow selecting the same file again
                    event.target.value = "";
                }}/>
                <button type="button" className="panel__toolbar-btn" onClick={() => fileInputRef.current!.click()} title={"Select a .glb, or a .gltf together with its .bin and texture files. You can also drop files or a folder onto the page."}>
                    <IconUpload/>
                    Upload glb/glTF
                </button>

                <Dropdown>
                    <Dropdown.Toggle as="button" type="button" className="panel__toolbar-btn" disabled={fileUploaded == null} data-testid={"babylon-download-toggle"}>
                        <IconDownload/>
                        Download
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        <Dropdown.Item onClick={() => exportInteractiveModel("glb")}>
                            GLB (.glb, single file)
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => exportInteractiveModel("gltf-zip")}>
                            glTF (.zip with .gltf, .bin and textures)
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>

            </div>

            {draggingFiles && (
                <div className={"model-drop-overlay"}>
                    Drop a .glb, or a .gltf with its .bin and textures (or their folder)
                </div>
            )}

            <div
                ref={viewportRef}
                className={`panel__body viewport-pane${viewportFullscreen.fallback ? " viewport-pane--fullscreen-fallback" : ""}`}
            >
                <canvas ref={canvasRef} style={{ width: '100%', flex: 1, minHeight: 0 }} data-testid={"babylon-engine-canvas"} />
                <ViewportControls
                    onFitView={() => autoFrame()}
                    fitTestId={"frame-btn"}
                    isFullscreen={viewportFullscreen.isFullscreen}
                    onToggleFullscreen={() => void viewportFullscreen.toggle()}
                    fullscreenTestId={"babylon-fullscreen-btn"}
                />
            </div>

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
