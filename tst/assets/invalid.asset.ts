import fs from "fs";
import path from "path";
import { jest } from "@jest/globals";
import { BasicBehaveEngine, GraphRejectedError } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import { getDefaultInteractivityGraph, validateInteractivityExtension } from "../../src/BasicBehaveEngine/validateInteractivity";
import { createGlTFObjectModelFromGltf, GlTFObjectModelDecorator } from "../../src/objectModel/glTFObjectModel";
import { attachHeadlessActiveCamera, getSampleAssetsRoot, loadAssetCases, runGraphAndWait, TestEventBus } from "./sampleAssetHarness";

jest.setTimeout(30_000);

interface InvalidCase {
    id: string;
    name: string;
    title: string;
    specSection: string;
    expectedOutcome: string;
    variants: { glTF: string };
}

const root = path.join(getSampleAssetsRoot(), "Tests", "Interactivity");
const cases: InvalidCase[] = JSON.parse(fs.readFileSync(path.join(root, "invalid", "invalid-index.json"), "utf8"));
const results: Record<string, unknown>[] = [];

afterAll(() => {
    const out = process.env.KHR_INTERACTIVITY_INVALID_RESULTS;
    if (out) {
        fs.writeFileSync(out, JSON.stringify(results, null, 1));
    }
});

describe("KHR_interactivity valid assets - validateInteractivityExtension", () => {
    it.each(loadAssetCases({ interGlb: "include" }))("$entry.name", (assetCase) => {
        if (assetCase.loadError) throw assetCase.loadError;
        validateInteractivityExtension(assetCase.gltf.extensions?.KHR_interactivity);
    });
});

describe("KHR_interactivity invalid assets - core engine", () => {
    it.each(cases)("$name/$id $title", async (testCase) => {
        const gltf = JSON.parse(fs.readFileSync(path.join(root, testCase.name, testCase.variants.glTF), "utf8"));
        const extension = gltf.extensions?.KHR_interactivity;

        let validatorError: string | undefined;
        try {
            validateInteractivityExtension(extension);
        } catch (error) {
            validatorError = String((error as Error).message ?? error);
        }

        // what the app's load path does: run the default graph, rejected only by the engine itself
        let engineOutcome = "ran";
        let engineError: string | undefined;
        let failedSignal = false;
        let graph: any;
        try {
            graph = getDefaultInteractivityGraph(extension);
        } catch {
            engineOutcome = "extensionRejected";
        }
        if (graph) {
            try {
                const engine = new BasicBehaveEngine(60, new TestEventBus());
                const decorator = new GlTFObjectModelDecorator(engine, createGlTFObjectModelFromGltf(gltf));
                attachHeadlessActiveCamera(decorator);
                decorator.addCustomEventListener("KHR_INTERACTIVITY:test/onFailed", () => { failedSignal = true; });
                await runGraphAndWait(decorator, graph);
            } catch (error) {
                engineOutcome = error instanceof GraphRejectedError ? "graphRejected" : "otherError";
                engineError = String((error as Error).message ?? error);
            }
        }

        results.push({ ...testCase, validatorError, engineOutcome, engineError, failedSignal });
        expect({ failedSignal, engineOutcome }).not.toEqual(expect.objectContaining({ failedSignal: true }));
    });
});
