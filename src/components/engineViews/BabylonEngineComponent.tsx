import React, {useEffect, useRef, useState, useContext} from "react";
import {Button, Container, Modal} from "react-bootstrap";
import {BabylonDecorator} from "../../decorators/BabylonDecorator";
import {BasicBehaveEngine} from "../../BasicBehaveEngine/BasicBehaveEngine";
import { InteractivityGraphContext } from "../../InteractivityGraphContext";
import { DOMEventBus } from "../../BasicBehaveEngine/eventBuses/DOMEventBus";
import { attachPointerEventLogging, SendCustomEventPanel } from "../../authoring/CustomEventControls";
import { computeExecutionDiagnostics, computeExtensionDiagnostics } from "../../diagnostics";
import { buildNormalizedTemplateSet } from "../../authoring/pointerCatalogue";
import { loadSelectedModelGraph } from "./modelGraphExecution";
import { buildBabylonDecoratorWorld, buildBabylonLoadedModel } from "./babylonLoadedModel";
import { IconPlay, IconSendEvent } from "../toolbarIcons";
import { useBabylonViewport } from "./useBabylonViewport";
import type { AssetContainer } from "@babylonjs/core";
import type { ModelFileEntry } from "./modelFiles";

enum BabylonEngineModal {
    CUSTOM_EVENT = "CUSTOM_EVENT",
    NONE = "NONE"
}

interface BabylonEngineComponentProps {
    modelUrl?: string | null;
}

export const BabylonEngineComponent: React.FC<BabylonEngineComponentProps> = ({ modelUrl }) => {
    const [graphRunning, setGraphRunning] = useState(false);
    const [openModal, setOpenModal] = useState<BabylonEngineModal>(BabylonEngineModal.NONE);
    const babylonEngineRef = useRef<BabylonDecorator | null>(null)

    const {getExecutableGraph, loadGraphFromJson, setDiagnosticsForCategory, setGltfObjectModel, setSupportedPointerTemplates, clearGraphDirty, registerPlayHandler} = useContext(InteractivityGraphContext);
    const viewport = useBabylonViewport({ modelUrl, testIdPrefix: "babylon", getExecutableGraph });
    const { sceneRef } = viewport;

    // Inspect the loaded glb's declared extensions (stashed on the scene metadata by the
    // authoring metadata loader extension) and surface any this tool does not support. Also
    // publish the addressable-object snapshot for the ref-value picker.
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
    const loadBehaveGraphReportingErrors = (graph: any) => {
        try {
            babylonEngineRef.current!.loadBehaveGraph(graph);
        } catch (error) {
            reportExecutionError(error);
            throw error;
        }
    };

    useEffect(() => {
        return () => {
            babylonEngineRef.current?.dispose();
            setSupportedPointerTemplates(null);
        };
    }, []);

    useEffect(() => {
        if (modelUrl && viewport.engineRef.current) {
            viewport.setUseUploadedFile(false);
            loadModelFromUrl(modelUrl);
        }
    }, [modelUrl]);

    useEffect(() => {
        if (viewport.fileUploaded !== null && viewport.useUploadedFile) {
            play(true)
        }
    }, [viewport.fileUploaded, viewport.useUploadedFile, viewport.uploadRevision])

    // The scene was reset by the load, but the decorator is not scene-owned, so tear down the
    // previous one explicitly to avoid stacking.
    const createDecorator = (container: AssetContainer) => {
        babylonEngineRef.current?.dispose();
        const world = buildBabylonDecoratorWorld(buildBabylonLoadedModel(container));
        babylonEngineRef.current = new BabylonDecorator(new BasicBehaveEngine(60, new DOMEventBus()), world, sceneRef.current!);
        setSupportedPointerTemplates(buildNormalizedTemplateSet(babylonEngineRef.current.getRegisteredJsonPointers()));
        attachPointerEventLogging(babylonEngineRef.current);
        setDiagnosticsForCategory("execution", []);
        babylonEngineRef.current.setExecutionErrorListener((error) => {
            console.warn("KHR_interactivity graph execution stopped", error);
            reportExecutionError(error);
        });
        return babylonEngineRef.current;
    };

    const runGraph = async (source: string | ModelFileEntry, shouldOverride: boolean) => {
        const container = await viewport.loadModel(source);
        reportGlbExtensionDiagnostics();
        const decorator = createDecorator(container);
        try {
            await loadSelectedModelGraph({
                authoredGraph: getExecutableGraph(),
                embeddedGraph: decorator.extractBehaveGraphFromScene(),
                replaceAuthoringGraph: shouldOverride,
                loadGraphFromJson,
                loadBehaveGraph: loadBehaveGraphReportingErrors,
            });
        } catch (error) {
            console.warn("KHR_interactivity graph execution stopped", error);
        }
        setGraphRunning(true);
        clearGraphDirty();
    };

    const play = (shouldOverrideGraph: boolean) => {
        const source = viewport.resolveModelSource();
        if (source === null) {
            console.warn("No model URL or file provided for Babylon engine");
            return;
        }
        runGraph(source, shouldOverrideGraph).catch((error) => console.error("Error loading model:", error));
    }

    // let the authoring menu bar's Reload button trigger this engine's Play without a direct
    // component reference (see registerPlayHandler on InteractivityGraphContext). `play` is
    // redefined every render, so the registered handler is a stable trampoline through a ref.
    const playRef = useRef(play);
    playRef.current = play;
    useEffect(() => {
        registerPlayHandler(() => playRef.current(false));
        return () => registerPlayHandler(null);
    }, []);

    const loadModelFromUrl = async (url: string) => {
        // Update the file uploaded state to enable the play button
        viewport.setFileUploaded(url.split('/').pop() || "model.glb");
        try {
            await runGraph(url, true);
        } catch (error) {
            console.error("Error loading model from URL:", error);
        }
    };

    return (
        <div className={"panel"}>
            <div className={"panel__toolbar"}>
                <button type="button" className="panel__toolbar-btn" onClick={() => play(false)} disabled={viewport.fileUploaded == null}>
                    <IconPlay/>
                    Play
                </button>

                <button type="button" className="panel__toolbar-btn" onClick={() => setOpenModal(BabylonEngineModal.CUSTOM_EVENT)} disabled={!graphRunning}>
                    <IconSendEvent/>
                    Send Custom Event
                </button>

                {viewport.modelToolbarControls}
            </div>

            {viewport.viewportPane}

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
        </div>
    )
}
