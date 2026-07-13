import type { IInteractivityGraph } from "../../BasicBehaveEngine/types/InteractivityGraph";
import { selectModelGraph } from "./modelGraphSelection";

export interface LoadSelectedModelGraphOptions {
    authoredGraph: IInteractivityGraph;
    embeddedGraph: IInteractivityGraph | null | undefined;
    replaceAuthoringGraph: boolean;
    loadGraphFromJson: (graph: IInteractivityGraph) => Promise<void> | void;
    loadBehaveGraph: (graph: IInteractivityGraph) => void;
}

export interface LoadedSelectedModelGraph {
    runtimeGraph: IInteractivityGraph;
    importedAuthoringGraph?: IInteractivityGraph;
    replaceAuthoringGraph: boolean;
}

const cloneGraph = (graph: IInteractivityGraph): IInteractivityGraph => JSON.parse(JSON.stringify(graph));

export const loadSelectedModelGraph = async ({
    authoredGraph,
    embeddedGraph,
    replaceAuthoringGraph,
    loadGraphFromJson,
    loadBehaveGraph,
}: LoadSelectedModelGraphOptions): Promise<LoadedSelectedModelGraph> => {
    const selection = selectModelGraph(authoredGraph, embeddedGraph, replaceAuthoringGraph);
    const runtimeGraph = cloneGraph(selection.graph);
    const importedAuthoringGraph = selection.replaceAuthoringGraph ? cloneGraph(selection.graph) : undefined;

    if (importedAuthoringGraph) {
        await loadGraphFromJson(importedAuthoringGraph);
    }

    loadBehaveGraph(runtimeGraph);

    return {
        runtimeGraph,
        importedAuthoringGraph,
        replaceAuthoringGraph: selection.replaceAuthoringGraph,
    };
};
