import { loadSelectedModelGraph } from "../src/components/engineViews/modelGraphExecution";
import type { IInteractivityGraph } from "../src/BasicBehaveEngine/types/InteractivityGraph";
import { jest } from "@jest/globals";

describe("Model graph execution selection", () => {
    it("imports an embedded URL-loaded graph before executing the runtime clone", async () => {
        const embeddedGraph = createGraph("embedded");
        const authoredGraph = createGraph("stale-authoring");
        const calls: string[] = [];
        let importedGraph: IInteractivityGraph | undefined;
        let runtimeGraph: IInteractivityGraph | undefined;

        const result = await loadSelectedModelGraph({
            authoredGraph,
            embeddedGraph,
            replaceAuthoringGraph: true,
            loadGraphFromJson: async (graph) => {
                calls.push("import:start");
                importedGraph = graph;
                await Promise.resolve();
                calls.push("import:end");
            },
            loadBehaveGraph: (graph) => {
                calls.push("run");
                runtimeGraph = graph;
            },
        });

        expect(calls).toEqual(["import:start", "import:end", "run"]);
        expect(importedGraph).toEqual(embeddedGraph);
        expect(runtimeGraph).toEqual(embeddedGraph);
        expect(importedGraph).not.toBe(embeddedGraph);
        expect(runtimeGraph).not.toBe(embeddedGraph);
        expect(runtimeGraph).not.toBe(importedGraph);
        expect(result.replaceAuthoringGraph).toBe(true);
    });

    it("executes the authored graph on Play without replacing authoring state", async () => {
        const embeddedGraph = createGraph("embedded");
        const authoredGraph = createGraph("authored");
        const loadGraphFromJson = jest.fn((graph: IInteractivityGraph) => undefined);
        let runtimeGraph: IInteractivityGraph | undefined;

        const result = await loadSelectedModelGraph({
            authoredGraph,
            embeddedGraph,
            replaceAuthoringGraph: false,
            loadGraphFromJson,
            loadBehaveGraph: (graph) => {
                runtimeGraph = graph;
            },
        });

        expect(loadGraphFromJson).not.toHaveBeenCalled();
        expect(runtimeGraph).toEqual(authoredGraph);
        expect(runtimeGraph).not.toBe(authoredGraph);
        expect(result.importedAuthoringGraph).toBeUndefined();
        expect(result.replaceAuthoringGraph).toBe(false);
    });

    it("uses the embedded graph for first Play when authoring state is empty", async () => {
        const embeddedGraph = createGraph("embedded");
        const emptyAuthoredGraph: IInteractivityGraph = {
            declarations: [],
            nodes: [],
            events: [],
            variables: [],
            types: [],
        };
        const loadGraphFromJson = jest.fn((graph: IInteractivityGraph) => undefined);

        await loadSelectedModelGraph({
            authoredGraph: emptyAuthoredGraph,
            embeddedGraph,
            replaceAuthoringGraph: false,
            loadGraphFromJson,
            loadBehaveGraph: () => undefined,
        });

        expect(loadGraphFromJson).toHaveBeenCalledWith(expect.objectContaining({
            variables: [{ name: "embedded", type: 0, value: [false] }],
        }));
    });
});

function createGraph(name: string): IInteractivityGraph {
    return {
        declarations: [{ op: "event/onStart" }],
        nodes: [{
            declaration: 0,
            flows: {
                output: {
                    start: { node: 0, socket: "start" },
                },
            },
        }],
        events: [],
        variables: [{ name, type: 0, value: [false] }],
        types: [{ signature: "bool" as any }],
    };
}
