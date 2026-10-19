/**
 * @jest-environment jsdom
 */
import React, { useContext } from "react";
import { act, render } from "@testing-library/react";
import { jest } from "@jest/globals";
import { TextDecoder } from "util";
import v8 from "v8";
import { InteractivityGraphContext, InteractivityGraphProvider } from "../../src/InteractivityGraphContext";
import { omitEmptyGraphArrays } from "../../src/authoring/executableGraph";
import { getDefaultInteractivityGraph, validateInteractivityGraph } from "../../src/BasicBehaveEngine/validateInteractivity";
import { BasicBehaveEngine } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import { loadAssetCases, TestEventBus } from "./sampleAssetHarness";

jest.setTimeout(30_000);
// jsdom lacks these Node globals (glb reading, graph loading)
Object.assign(globalThis, { TextDecoder, structuredClone: (value: unknown) => v8.deserialize(v8.serialize(value)) });

// The editor must export a valid graph for every valid asset it imports (load -> getExecutableGraph).
describe("KHR_interactivity valid assets - editor round trip", () => {
    let context: React.ContextType<typeof InteractivityGraphContext>;
    const Probe = () => {
        context = useContext(InteractivityGraphContext);
        return null;
    };

    // testing-library unmounts after every test, so each case gets a fresh provider
    beforeEach(() => {
        render(React.createElement(InteractivityGraphProvider, null, React.createElement(Probe)));
    });

    // a model without KHR_interactivity runs and imports the empty graph {}
    it("empty graph", async () => {
        const engine = new BasicBehaveEngine(60, new TestEventBus());
        try {
            engine.loadBehaveGraph({}, false);
        } finally {
            engine.dispose();
        }
        await act(async () => {
            await context.loadGraphFromJson({});
        });
        validateInteractivityGraph(omitEmptyGraphArrays(context.getExecutableGraph()));
    });

    it.each(loadAssetCases({ interGlb: "include" }))("$entry.name", async (assetCase) => {
        if (assetCase.loadError) throw assetCase.loadError;
        const graph = getDefaultInteractivityGraph(assetCase.gltf.extensions?.KHR_interactivity);
        await act(async () => {
            await context.loadGraphFromJson(JSON.parse(JSON.stringify(graph)));
        });
        const executable = omitEmptyGraphArrays(context.getExecutableGraph());
        expect(executable.nodes?.length ?? 0).toBe(graph.nodes?.length ?? 0);
        validateInteractivityGraph(executable);
    });
});
