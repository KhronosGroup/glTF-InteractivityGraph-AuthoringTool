import type { IInteractivityGraph } from "../../BasicBehaveEngine/types/InteractivityGraph";

export interface ModelGraphSelection {
    graph: IInteractivityGraph;
    replaceAuthoringGraph: boolean;
}

const createEmptyInteractivityGraph = (): IInteractivityGraph => ({
    declarations: [],
    nodes: [],
    events: [],
    variables: [],
    types: [],
});

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
