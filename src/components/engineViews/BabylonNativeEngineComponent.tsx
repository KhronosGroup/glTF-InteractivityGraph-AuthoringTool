import React, { useContext, useEffect, useRef, useState } from "react";
import { Button, Container, Modal } from "react-bootstrap";
import { InteractivityGraphContext } from "../../InteractivityGraphContext";
import { SendCustomEventPanel } from "../../authoring/CustomEventControls";
import { computeExtensionDiagnostics } from "../../diagnostics";
import { setInteractivityGraph } from "../../objectModel/glTFBinary";
import type { IInteractivityGraph } from "../../BasicBehaveEngine/types/InteractivityGraph";
import { selectModelGraph } from "./modelGraphSelection";
import type { ModelFileEntry } from "./modelFiles";
import { getNativeGraphDiagnostics, getNativeSupportedPointerTemplates, NativeGraphRun, startNativeGraph } from "./babylonNativeInteractivity";
import { IconPlay, IconSendEvent } from "../toolbarIcons";
import { useBabylonViewport } from "./useBabylonViewport";

interface BabylonNativeEngineComponentProps {
    modelUrl?: string | null;
}

const cloneGraph = (graph: IInteractivityGraph): IInteractivityGraph => JSON.parse(JSON.stringify(graph));

/**
 * Runs graphs with Babylon.js' own KHR_interactivity implementation (FlowGraph) instead of
 * BasicBehaveEngine. The graph to run is written into the glTF JSON before Babylon reads it.
 */
export const BabylonNativeEngineComponent: React.FC<BabylonNativeEngineComponentProps> = ({ modelUrl }) => {
    const [graphRunning, setGraphRunning] = useState(false);
    const [customEventModalOpen, setCustomEventModalOpen] = useState(false);
    const graphRunRef = useRef<NativeGraphRun | undefined>(undefined);

    const {getExecutableGraph, loadGraphFromJson, setDiagnosticsForCategory, setGltfObjectModel, setSupportedPointerTemplates, clearGraphDirty, registerPlayHandler} = useContext(InteractivityGraphContext);
    const viewport = useBabylonViewport({ modelUrl, testIdPrefix: "babylon-native", getExecutableGraph });
    const { sceneRef } = viewport;

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
        return () => {
            graphRunRef.current?.dispose();
            setSupportedPointerTemplates(null);
        };
    }, []);

    useEffect(() => {
        if (modelUrl && viewport.engineRef.current) {
            viewport.setUseUploadedFile(false);
            viewport.setFileUploaded(modelUrl.split('/').pop() || "model.glb");
            runGraph(modelUrl, true).catch((error) => console.error("Error loading model from URL:", error));
        }
    }, [modelUrl]);

    useEffect(() => {
        if (viewport.fileUploaded !== null && viewport.useUploadedFile) {
            play(true);
        }
    }, [viewport.fileUploaded, viewport.useUploadedFile, viewport.uploadRevision]);

    const runGraph = async (source: string | ModelFileEntry, replaceAuthoringGraph: boolean) => {
        graphRunRef.current?.dispose();
        graphRunRef.current = undefined;
        setGraphRunning(false);

        let runtimeGraph: IInteractivityGraph | undefined;
        let importedAuthoringGraph: IInteractivityGraph | undefined;
        await viewport.loadModel(source, {
            nativeInteractivity: true,
            onParsedJson: (json) => {
                const interactivity = json.extensions?.KHR_interactivity;
                const embeddedGraph = interactivity?.graphs?.[interactivity.graph ?? 0];
                const selection = selectModelGraph(getExecutableGraph(), embeddedGraph, replaceAuthoringGraph);
                runtimeGraph = cloneGraph(selection.graph);
                if (selection.replaceAuthoringGraph) {
                    // the asset's own graph runs unchanged and is shown in the editor
                    importedAuthoringGraph = cloneGraph(selection.graph);
                } else {
                    setInteractivityGraph(json, cloneGraph(selection.graph));
                }
            },
        });
        reportGlbExtensionDiagnostics();
        if (importedAuthoringGraph) {
            await loadGraphFromJson(importedAuthoringGraph);
        }

        const scene = sceneRef.current!;
        setSupportedPointerTemplates(getNativeSupportedPointerTemplates());
        setDiagnosticsForCategory("execution", getNativeGraphDiagnostics(scene));
        if (runtimeGraph) {
            graphRunRef.current = startNativeGraph(scene, runtimeGraph);
        }
        setGraphRunning(graphRunRef.current !== undefined);
        clearGraphDirty();
    };

    const play = (replaceAuthoringGraph: boolean) => {
        const source = viewport.resolveModelSource();
        if (source === null) {
            console.warn("No model URL or file provided for Babylon engine");
            return;
        }
        runGraph(source, replaceAuthoringGraph).catch((error) => console.error("Error loading model:", error));
    };

    // stable trampoline for the menu bar's Reload button (see registerPlayHandler)
    const playRef = useRef(play);
    playRef.current = play;
    useEffect(() => {
        registerPlayHandler(() => playRef.current(false));
        return () => registerPlayHandler(null);
    }, []);

    return (
        <div className={"panel"}>
            <div className={"panel__toolbar"}>
                <button type="button" className="panel__toolbar-btn" onClick={() => play(false)} disabled={viewport.fileUploaded == null}>
                    <IconPlay/>
                    Play
                </button>

                <button type="button" className="panel__toolbar-btn" onClick={() => setCustomEventModalOpen(true)} disabled={!graphRunning}>
                    <IconSendEvent/>
                    Send Custom Event
                </button>

                {viewport.modelToolbarControls}
            </div>

            {viewport.viewportPane}

            <Modal size="lg" show={customEventModalOpen} onHide={() => setCustomEventModalOpen(false)}>
                <Container style={{padding: 16}}>
                    <h3>Send Custom Event</h3>
                    <SendCustomEventPanel graph={getExecutableGraph()} />
                    <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                    <Button variant={"outline-secondary"} style={{width: "100%"}} onClick={() => setCustomEventModalOpen(false)}>
                        Close
                    </Button>
                </Container>
            </Modal>
        </div>
    );
};
