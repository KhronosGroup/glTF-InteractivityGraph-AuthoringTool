import type { IInteractivityGraph } from "../../BasicBehaveEngine/types/InteractivityGraph";

export interface ModelGraphSelection {
    graph: IInteractivityGraph;
    replaceAuthoringGraph: boolean;
}

// spec: every graph-level array is optional and must not be empty, so "no graph" is {}
const createEmptyInteractivityGraph = (): IInteractivityGraph => ({}) as IInteractivityGraph;

/** Select the graph after loading a model, explicitly replacing stale authoring state when needed. */
export const selectModelGraph = (
    authoredGraph: IInteractivityGraph,
    embeddedGraph: IInteractivityGraph | null | undefined,
    replaceAuthoringGraph: boolean,
): ModelGraphSelection => {
    const shouldReplace = replaceAuthoringGraph || !authoredGraph.nodes?.length;
    return {
        graph: shouldReplace ? (embeddedGraph ?? createEmptyInteractivityGraph()) : authoredGraph,
        replaceAuthoringGraph: shouldReplace,
    };
};
