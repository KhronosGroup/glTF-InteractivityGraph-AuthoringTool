import path from "path";
import { jest } from "@jest/globals";
import { BasicBehaveEngine } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import {
    createGenericWorldFromGltf,
    DEFAULT_SAMPLE_ASSETS_ROOT,
    GenericTestDecorator,
    readGlbJson,
    runGraphAndWait,
    TestEventBus,
} from "./sampleAssetHarness";

jest.setTimeout(30_000);

describe("KHR_interactivity Overview asset", () => {
    it("reports the current invalid event parameter typing under strict spec execution", async () => {
        const glbPath = path.join(DEFAULT_SAMPLE_ASSETS_ROOT, "Tests", "Interactivity", "Overview.glb");
        const gltf = readGlbJson(glbPath);
        const interactivity = gltf.extensions?.KHR_interactivity;
        const graphIndex = interactivity?.graph ?? 0;
        const graph = interactivity?.graphs?.[graphIndex];

        const eventBus = new TestEventBus();
        const engine = new BasicBehaveEngine(60, eventBus);
        const decorator = new GenericTestDecorator(engine, createGenericWorldFromGltf(gltf));

        await expect(runGraphAndWait(decorator, graph)).rejects.toThrow("input types not equivalent: a=ref, b=int");
    });
});
