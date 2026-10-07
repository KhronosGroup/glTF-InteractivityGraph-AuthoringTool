import React, { useEffect, useRef, useState } from "react";
import { Dropdown } from "react-bootstrap";
import {
    AbstractMesh,
    ArcRotateCamera,
    AssetContainer,
    Color4,
    DirectionalLight,
    Engine,
    FramingBehavior,
    HemisphericLight,
    Mesh,
    Vector3,
} from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { loadGltfAssetContainer } from "./babylonLoader";
import { downloadInteractiveModel, ModelExportFormat, ModelSource } from "./modelExport";
import { entriesFromDataTransfer, entriesFromFileList, findModelEntry, ModelFileEntry, pluginExtensionForName, pluginExtensionForUrl, registerModelFiles } from "./modelFiles";
import { configureModelNavigation, MODEL_VIEW_Z_DIRECTION } from "./cameraFraming";
import { useDevicePixelRatio } from "../../hooks/useDevicePixelRatio";
import { useFullscreen } from "../../hooks/useFullscreen";
import { IconDownload, IconUpload } from "../toolbarIcons";
import { ViewportControls } from "./ViewportControls";
import type { IInteractivityGraph } from "../../BasicBehaveEngine/types/InteractivityGraph";

/** upper bound for the device-pixel render scale (see the devicePixelRatio effect) */
const MAX_RENDER_SCALE = 2;

export interface ViewportModelLoadOptions {
    nativeInteractivity?: boolean;
    onParsedJson?: (json: any) => void;
}

export interface BabylonViewportOptions {
    modelUrl?: string | null;
    /** prefix for the data-testid of the shared controls, e.g. "babylon" */
    testIdPrefix: string;
    getExecutableGraph: () => IInteractivityGraph;
}

/** Engine, scene, camera framing and model file handling shared by the Babylon engine views. */
export const useBabylonViewport = ({ modelUrl, testIdPrefix, getExecutableGraph }: BabylonViewportOptions) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const engineRef = useRef<Engine | null>(null);
    const sceneRef = useRef<Scene>();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [fileUploaded, setFileUploaded] = useState<string | null>(null);
    // Tracks whether the most recent model selection was a local file upload (vs. a modelUrl
    // sample/URL). modelUrl stays set in state/URL after a sample load, so a reload needs this
    // to know which source should win.
    const [useUploadedFile, setUseUploadedFile] = useState(false);
    // the uploaded/dropped model and its companion files (.bin, textures), with relative paths
    const selectedFilesRef = useRef<ModelFileEntry[]>([]);
    // bumped per selection so re-selecting a file with the same name reloads it
    const [uploadRevision, setUploadRevision] = useState(0);
    const [draggingFiles, setDraggingFiles] = useState(false);
    const devicePixelRatio = useDevicePixelRatio();
    const fullscreen = useFullscreen(viewportRef);

    useEffect(() => {
        // adaptToDeviceRatio (4th arg) makes the very first frame render at the display's native
        // pixels instead of CSS pixels. The ongoing ratio is owned by the effect below.
        engineRef.current = new Engine(canvasRef.current, true, undefined, true);
        createScene();

        // Blocks page-scroll while over the canvas. Registered once here (not in createScene,
        // which re-runs on every load) so it doesn't stack up duplicate listeners.
        const canvas = canvasRef.current!;
        const blockWheelPropagation = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };
        canvas.addEventListener("wheel", blockWheelPropagation);

        engineRef.current.runRenderLoop(() => {
            sceneRef.current?.render();
        });

        return () => {
            canvas.removeEventListener("wheel", blockWheelPropagation);
            sceneRef.current?.dispose();
            engineRef.current?.dispose();
        };
    }, []);

    // Render at the display's native pixels, capped: on a 4K/200% screen an uncapped ratio means
    // ~4x the fragments for a viewport that is only half the window.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) { return; }
        engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, MAX_RENDER_SCALE));
        engine.resize();
    }, [devicePixelRatio]);

    useEffect(() => {
        const resizeEngine = () => engineRef.current?.resize();
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

    const setupCamera = () => {
        const camera = sceneRef.current!.activeCamera as ArcRotateCamera;
        camera.useFramingBehavior = true;
        const framingBehavior = camera.getBehaviorByName("Framing") as FramingBehavior;
        framingBehavior.framingTime = 0;
        framingBehavior.elevationReturnTime = -1;
        configureModelNavigation(camera, camera.radius);
    };

    const createScene = () => {
        sceneRef.current = new Scene(engineRef.current!);
        sceneRef.current.clearColor = new Color4(1, 1, 1, 1);
        sceneRef.current.createDefaultCamera(true, true, true);
        setupCamera();
        new HemisphericLight("light1", new Vector3(0, 1, 0), sceneRef.current);
        new DirectionalLight("light2", new Vector3(1, -1, 0), sceneRef.current);
    };

    const autoFrame = () => {
        const scene = sceneRef.current!;
        let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
        scene.meshes.forEach((mesh: AbstractMesh) => {
            if (mesh instanceof Mesh && mesh.isVisible) {
                mesh.computeWorldMatrix(true);
                const boundingInfo = mesh.getBoundingInfo();
                min = Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
                max = Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
            }
        });
        const center = min.add(max).scale(0.5);
        const size = max.subtract(min);
        const maxDimension = Math.max(size.x, size.y, size.z);
        const distance = maxDimension * 2.5;

        const camera = scene.activeCamera as ArcRotateCamera;
        camera.target = center;
        camera.setPosition(new Vector3(
            center.x,
            center.y + maxDimension * 0.4,
            center.z + distance * MODEL_VIEW_Z_DIRECTION,
        ));
        camera.radius = distance;
        // loading replaces the camera (createDefaultCamera), so navigation is set up on every frame-in
        configureModelNavigation(camera, maxDimension);
    };

    /** The model a reload should show: a fresh upload wins over modelUrl, which wins over an older upload. */
    const resolveModelSource = (): string | ModelFileEntry | null => {
        const uploadedModel = findModelEntry(selectedFilesRef.current);
        if (useUploadedFile && uploadedModel) {
            return uploadedModel;
        }
        return modelUrl ?? uploadedModel ?? null;
    };

    /** Replaces the scene with a fresh one showing `source`, framed by a new default camera. */
    const loadModel = async (source: string | ModelFileEntry, options: ViewportModelLoadOptions = {}): Promise<AssetContainer> => {
        // a fresh scene drops the prior model's meshes/observers, so models don't stack up
        sceneRef.current?.dispose();
        createScene();

        let container: AssetContainer;
        if (typeof source === "string") {
            container = await loadGltfAssetContainer(source, sceneRef.current!, { ...options, pluginExtension: pluginExtensionForUrl(source) });
        } else {
            // a .gltf resolves its .bin/textures among the other selected files
            registerModelFiles(selectedFilesRef.current, source);
            container = await loadGltfAssetContainer(source.file, sceneRef.current!, { ...options, pluginExtension: pluginExtensionForName(source.file.name) });
        }
        container.addAllToScene();
        sceneRef.current!.createDefaultCamera(true, true, true);
        autoFrame();
        return container;
    };

    // Mirrors resolveModelSource: whichever glb the viewport currently shows is the one the graph
    // gets embedded into.
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
    };

    const modelToolbarControls = (
        <>
            <span className={"panel__toolbar-label"}>Model</span>
            {/* a .gltf is selected together with its .bin and texture files */}
            <input className="d-none" type="file" multiple accept=".glb,.gltf,.bin,image/*" ref={fileInputRef} data-testid={`${testIdPrefix}-engine-file-input`} onChange={(event) => {
                selectModelFiles(entriesFromFileList(event.target.files));
                // allow selecting the same file again
                event.target.value = "";
            }}/>
            <button type="button" className="panel__toolbar-btn" onClick={() => fileInputRef.current!.click()} title={"Select a .glb, or a .gltf together with its .bin and texture files. You can also drop files or a folder onto the page."}>
                <IconUpload/>
                Upload glb/glTF
            </button>

            <Dropdown>
                <Dropdown.Toggle as="button" type="button" className="panel__toolbar-btn" disabled={fileUploaded == null} data-testid={`${testIdPrefix}-download-toggle`}>
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
        </>
    );

    const viewportPane = (
        <>
            {draggingFiles && (
                <div className={"model-drop-overlay"}>
                    Drop a .glb, or a .gltf with its .bin and textures (or their folder)
                </div>
            )}

            <div
                ref={viewportRef}
                className={`panel__body viewport-pane${fullscreen.fallback ? " viewport-pane--fullscreen-fallback" : ""}`}
            >
                <canvas ref={canvasRef} style={{ width: "100%", flex: 1, minHeight: 0 }} data-testid={`${testIdPrefix}-engine-canvas`} />
                <ViewportControls
                    onFitView={() => autoFrame()}
                    // the original Babylon view's fit button predates the prefix
                    fitTestId={testIdPrefix === "babylon" ? "frame-btn" : `${testIdPrefix}-frame-btn`}
                    isFullscreen={fullscreen.isFullscreen}
                    onToggleFullscreen={() => void fullscreen.toggle()}
                    fullscreenTestId={`${testIdPrefix}-fullscreen-btn`}
                />
            </div>
        </>
    );

    return {
        sceneRef,
        engineRef,
        fileUploaded,
        setFileUploaded,
        useUploadedFile,
        setUseUploadedFile,
        uploadRevision,
        resolveModelSource,
        loadModel,
        modelToolbarControls,
        viewportPane,
    };
};
