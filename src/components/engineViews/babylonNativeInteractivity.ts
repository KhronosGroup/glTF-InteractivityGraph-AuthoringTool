import type { Scene } from "@babylonjs/core";
import type { FlowGraph } from "@babylonjs/core/FlowGraph/flowGraph";
import type { FlowGraphCoordinator } from "@babylonjs/core/FlowGraph/flowGraphCoordinator";
import { defaultValueParseFunction } from "@babylonjs/core/FlowGraph/serialization";
import {
    GetKHRInteractivityImportResult,
    IKHRInteractivityGraphImportResult,
} from "@babylonjs/loaders/glTF/2.0/Extensions/KHR_interactivity.pure";
import {
    _NormalizeKHRInteractivityRuntimeValue,
    gltfTypeToBabylonType,
    IKHRInteractivityDiagnostic,
} from "@babylonjs/loaders/glTF/2.0/Extensions/KHR_interactivity/interactivityGraphModel";
import { GetMappingForKey } from "@babylonjs/loaders/glTF/2.0/Extensions/objectModelMapping";
import {
    InteractivityAssetCapabilitiesPrefix,
    InteractivityLimitsPrefix,
} from "@babylonjs/loaders/glTF/2.0/Extensions/interactivityAssetPathToObjectConverter";
import {
    getCustomEventChannel,
    IInteractivityGraph,
    IInteractivityVariable,
} from "../../BasicBehaveEngine/types/InteractivityGraph";
import type { IGraphDiagnostic } from "../../diagnostics";
import { normalizePointerTemplate, pointerCatalogue } from "../../authoring/pointerCatalogue";

/** The import result of the graph Babylon selected to run (the asset's default graph). */
export function getDefaultGraphImportResult(scene: Scene): IKHRInteractivityGraphImportResult | undefined {
    const result = GetKHRInteractivityImportResult(scene);
    // -1: the asset's `graph` selection is invalid, so no graph runs
    return result?.graphs[result.document.defaultGraphIndex];
}

export interface NativeGraphRun {
    graphResult: IKHRInteractivityGraphImportResult;
    /** removes the custom event bridge; the coordinator itself is disposed with the scene */
    dispose: () => void;
}

/**
 * Starts the default graph of an asset loaded with nativeInteractivity, after bridging its custom
 * events so listeners see event/onStart's first sends. Undefined when Babylon rejected the graph.
 */
export function startNativeGraph(scene: Scene, graph: IInteractivityGraph): NativeGraphRun | undefined {
    const graphResult = getDefaultGraphImportResult(scene);
    const coordinator = graphResult?.coordinator;
    if (!graphResult?.flowGraph || !coordinator) {
        return undefined;
    }
    const dispose = bridgeCustomEvents(graph, coordinator, scene);
    coordinator.start();
    return { graphResult, dispose };
}

/** Babylon's validation/lowering diagnostics, mapped onto the diagnostics panel. */
export function getNativeGraphDiagnostics(scene: Scene): IGraphDiagnostic[] {
    const result = GetKHRInteractivityImportResult(scene);
    if (!result) {
        return [];
    }
    const graphResult = getDefaultGraphImportResult(scene);
    const rejected = graphResult !== undefined && graphResult.flowGraph === undefined;
    const diagnostics = [...result.document.diagnostics, ...(graphResult?.diagnostics ?? [])];
    return diagnostics.map((diagnostic) => toGraphDiagnostic(diagnostic, rejected));
}

const toGraphDiagnostic = (diagnostic: IKHRInteractivityDiagnostic, graphRejected: boolean): IGraphDiagnostic => {
    const nodeMatch = /\/nodes\/(\d+)(?:\/|$)/.exec(diagnostic.path.replace(/^.*\/graphs\/\d+/, ""));
    return {
        severity: diagnostic.severity,
        category: "execution",
        impact: diagnostic.severity === "error" && graphRejected ? "graphRejected" : undefined,
        title: `Babylon: ${diagnostic.message}`,
        detail: diagnostic.path,
        nodeIndex: nodeMatch ? Number(nodeMatch[1]) : undefined,
    };
};

/**
 * Connects the coordinator's custom events with the document event channel the authoring UI uses
 * (see CustomEventControls): UI-triggered events reach event/receive, event/send shows up in the
 * monitors. Returns a function that removes the bridge.
 */
export function bridgeCustomEvents(graph: IInteractivityGraph, coordinator: FlowGraphCoordinator, scene: Scene): () => void {
    const cleanups: (() => void)[] = [];
    // set while the coordinator's own event is mirrored to the document, so it is not fed back
    let mirroring = false;

    (graph.events ?? []).forEach((event, index) => {
        const channel = getCustomEventChannel(event, index);
        // events without an id are internal-only and have no Babylon id we could address
        const eventId = event.id;
        if (eventId === undefined) {
            return;
        }

        const toBabylon = (detail: Record<string, any> | undefined): Record<string, any> => {
            const data: Record<string, any> = {};
            for (const [key, declaration] of Object.entries(event.values ?? {})) {
                if (detail?.[key] === undefined) {
                    continue;
                }
                const signature = graph.types?.[declaration.type]?.signature as keyof typeof gltfTypeToBabylonType | undefined;
                data[key] = toBabylonValue(detail[key], signature, scene);
            }
            return data;
        };

        const onDocumentEvent = (domEvent: Event) => {
            if (!mirroring) {
                coordinator.notifyCustomEvent(eventId, toBabylon((domEvent as CustomEvent).detail));
            }
        };
        document.addEventListener(channel, onDocumentEvent);
        cleanups.push(() => document.removeEventListener(channel, onDocumentEvent));

        const observer = coordinator.getCustomEventObservable(eventId).add((data: Record<string, any> | undefined) => {
            const detail: Record<string, any> = {};
            for (const [key, value] of Object.entries(data ?? {})) {
                detail[key] = _NormalizeKHRInteractivityRuntimeValue(value);
            }
            mirroring = true;
            try {
                document.dispatchEvent(new CustomEvent(channel, { detail }));
            } finally {
                mirroring = false;
            }
        });
        cleanups.push(() => coordinator.getCustomEventObservable(eventId).remove(observer));
    });

    return () => cleanups.forEach((cleanup) => cleanup());
}

// the UI sends components as arrays, scalars as numbers and bools as "true"/"false" strings
const toBabylonValue = (value: any, signature: keyof typeof gltfTypeToBabylonType | undefined, scene: Scene): any => {
    const flowGraphType = signature ? gltfTypeToBabylonType[signature]?.flowGraphType : undefined;
    if (flowGraphType === undefined || flowGraphType === "any") {
        return value;
    }
    if (flowGraphType === "boolean") {
        return value === true || value === "true" || (Array.isArray(value) && value[0] === true);
    }
    const components = Array.isArray(value) ? value : [value];
    return defaultValueParseFunction("value", { value: { type: flowGraphType, value: components } }, null as any, scene);
};

// pointers Babylon's KHR_interactivity adds to each asset's own object model, not to the global mapping
const NATIVE_INTERACTIVITY_POINTER_PREFIXES = [
    "/extensions/KHR_interactivity/activeCamera/",
    "/animations/{}/extensions/KHR_interactivity/",
    InteractivityAssetCapabilitiesPrefix,
    InteractivityLimitsPrefix,
];

/**
 * Catalogue pointer templates Babylon can resolve, in normalized form. Extension pointers are only
 * registered once an asset using that extension was loaded, so call this after loading.
 */
export function getNativeSupportedPointerTemplates(): ReadonlySet<string> {
    const supported = new Set<string>();
    for (const entry of pointerCatalogue) {
        const template = normalizePointerTemplate(entry.template);
        if (NATIVE_INTERACTIVITY_POINTER_PREFIXES.some((prefix) => template.startsWith(prefix)) || GetMappingForKey(toMappingKey(template))) {
            supported.add(template);
        }
    }
    return supported;
}

// Babylon keys array lengths as a trailing "length" segment ("/nodes/{}/children/length")
const toMappingKey = (template: string): string => template.replace(/\.length$/, "/length");

/** The graph's variables as the BasicBehaveEngine stores them (value as a component array). */
export function readNativeVariables(flowGraph: FlowGraph, graph: IInteractivityGraph): IInteractivityVariable[] {
    const context = flowGraph.getContext(0);
    return (graph.variables ?? []).map((variable, index) => ({
        ...variable,
        value: _NormalizeKHRInteractivityRuntimeValue(context?.userVariables[`staticVariable_${index}`]),
    }));
}
