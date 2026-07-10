import fs from "fs";
import path from "path";
import { TextDecoder, TextEncoder } from "util";
import { jest } from "@jest/globals";
import { BasicBehaveEngine } from "../src/BasicBehaveEngine/BasicBehaveEngine";
import { BabylonDecorator } from "../src/decorators/BabylonDecorator";
import { BabylonScene, loadBabylonWorldFromGlb, NullEngine } from "./assets/babylonAssetHarness";
import { getSampleAssetsRoot, readGlbJson, runGraphAndWait, TestEventBus } from "./assets/sampleAssetHarness";

jest.setTimeout(30_000);

if (globalThis.TextDecoder === undefined) {
    (globalThis as any).TextDecoder = TextDecoder;
}
if (globalThis.TextEncoder === undefined) {
    (globalThis as any).TextEncoder = TextEncoder;
}

const asset = loadWhackAMoleAsset();
const describeIfAvailable = asset.missing ? describe.skip : describe;

describeIfAvailable("KHR_interactivity WhackAMole sample - Babylon engine", () => {
    it("exposes animation object refs and metadata for every graph-referenced animation", async () => {
        if (asset.loadError) {
            throw asset.loadError;
        }

        const nullEngine = new NullEngine();
        const scene = new BabylonScene(nullEngine);
        try {
            const eventBus = new TestEventBus();
            const engine = new BasicBehaveEngine(60, eventBus);
            const world = await loadBabylonWorldFromGlb(asset.glbPath, scene);
            const decorator = new BabylonDecorator(engine, world, scene);
            const graph = scene.metadata?.behaveGraph ?? asset.graph;
            const animationIndices = getGraphReferencedAnimationIndices(asset.graph);

            expect(world.animations).toHaveLength(asset.gltf.animations.length);
            expect(graph).toBeDefined();
            for (const animationIndex of animationIndices) {
                expect(decorator.isValidJsonPtr(`/animations/${animationIndex}/`)).toBe(true);
                expect(decorator.getPathtypeName(`/animations/${animationIndex}/`)).toBe("ref");
                expect(decorator.getPathValue(`/animations/${animationIndex}/`)).toEqual([`/animations/${animationIndex}/`]);
                expect(decorator.isValidJsonPtr(`/animations/${animationIndex}/extensions/KHR_interactivity/maxTime`)).toBe(true);
                expect(Number.isFinite(decorator.getPathValue(`/animations/${animationIndex}/extensions/KHR_interactivity/maxTime`)?.[0])).toBe(true);
            }
        } finally {
            scene.dispose();
            nullEngine.dispose();
        }
    });

    it("loads and runs the graph through the Babylon decorator", async () => {
        if (asset.loadError) {
            throw asset.loadError;
        }

        const nullEngine = new NullEngine();
        const scene = new BabylonScene(nullEngine);
        try {
            const eventBus = new TestEventBus();
            const engine = new BasicBehaveEngine(60, eventBus);
            const world = await loadBabylonWorldFromGlb(asset.glbPath, scene);
            const decorator = new BabylonDecorator(engine, world, scene);
            const graph = scene.metadata?.behaveGraph ?? asset.graph;

            await runGraphAndWait(decorator, graph);
        } finally {
            scene.dispose();
            nullEngine.dispose();
        }
    });
});

function loadWhackAMoleAsset(): { glbPath: string; gltf?: any; graph?: any; loadError?: Error; missing?: boolean } {
    const glbPath = path.join(getSampleAssetsRoot(), "Models", "WhackAMole", "glTF-Binary", "WhackAMole.glb");
    if (!fs.existsSync(glbPath)) {
        return { glbPath, missing: true, loadError: new Error(`WhackAMole sample asset not found at ${glbPath}`) };
    }

    try {
        const gltf = readGlbJson(glbPath);
        const interactivity = gltf.extensions?.KHR_interactivity;
        const graphIndex = interactivity?.graph ?? 0;
        const graph = interactivity?.graphs?.[graphIndex];
        if (!graph) {
            throw new Error(`No KHR_interactivity graph found in ${glbPath}`);
        }
        return { glbPath, gltf, graph };
    } catch (error) {
        return { glbPath, loadError: error instanceof Error ? error : new Error(String(error)) };
    }
}

function getGraphReferencedAnimationIndices(graph: any): number[] {
    const indices = new Set<number>();
    for (const node of graph.nodes ?? []) {
        const op = graph.declarations?.[node.declaration]?.op ?? node.op;
        const pointer = node.configuration?.pointer?.value?.[0];
        if (op !== "pointer/get" || typeof pointer !== "string" || !pointer.startsWith("/animations/[index]/")) {
            continue;
        }

        const animationIndex = Number(node.values?.index?.value?.[0]);
        if (Number.isInteger(animationIndex)) {
            indices.add(animationIndex);
        }
    }
    return [...indices].sort((a, b) => a - b);
}
