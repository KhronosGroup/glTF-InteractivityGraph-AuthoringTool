import { jest } from "@jest/globals";
import { NullEngine, PBRMaterial, Quaternion, Scene as BabylonScene, TransformNode, Mesh as BabylonMesh } from "@babylonjs/core";
import { BasicBehaveEngine } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import { BabylonDecorator } from "../../src/decorators/BabylonDecorator";
import {
    assertAssetSubTest,
    formatError,
    getAssetSubTests,
    loadAssetCases,
    runGraphAndWait,
    TestEventBus,
} from "./sampleAssetHarness";

jest.setTimeout(30_000);

const cases = loadAssetCases();

describe("KHR_interactivity sample assets - Babylon engine", () => {
    describe.each(cases)("$entry.name", (assetCase) => {
        const subTests = getAssetSubTests(assetCase.metadata);
        let variables: BasicBehaveEngine["variables"] = [];
        let runError: Error | undefined;

        beforeAll(async () => {
            if (assetCase.loadError) {
                runError = assetCase.loadError;
                return;
            }

            const nullEngine = new NullEngine();
            const scene = new BabylonScene(nullEngine);
            try {
                const eventBus = new TestEventBus();
                const engine = new BasicBehaveEngine(60, eventBus);
                const world = createBabylonWorld(assetCase.gltf, scene);
                const decorator = new BabylonDecorator(engine, world, scene);

                await runGraphAndWait(decorator, assetCase.graph);
                variables = engine.variables;
            } catch (error) {
                runError = error instanceof Error ? error : new Error(String(error));
            } finally {
                scene.dispose();
                nullEngine.dispose();
            }
        });

        it.each(subTests)("$displayName", ({ subTest }) => {
            if (runError) {
                throw new Error(`${assetCase.entry.name} did not load or execute, so all ${subTests.length} subtest(s) fail:\n${formatError(runError)}`);
            }

            assertAssetSubTest(assetCase.entry.name, variables, subTest);
        });
    });
});

function createBabylonWorld(gltf: any, scene: BabylonScene): any {
    const materials = (gltf.materials ?? []).map((material: any, index: number) => {
        const pbr = material.pbrMetallicRoughness ?? {};
        const mat = new PBRMaterial(material.name ?? `material-${index}`, scene);
        const color = pbr.baseColorFactor ?? [1, 1, 1, 1];
        mat.albedoColor.set(color[0], color[1], color[2]);
        mat.alpha = color[3];
        mat.roughness = pbr.roughnessFactor ?? 1;
        mat.metallic = pbr.metallicFactor ?? 1;
        mat.alphaCutOff = material.alphaCutoff ?? 0;
        return mat;
    });

    const nodes = (gltf.nodes ?? []).map((node: any, index: number) => {
        const materialIndex = gltf.meshes?.[node.mesh]?.primitives?.[0]?.material;
        const transform = node.mesh !== undefined
            ? new BabylonMesh(node.name ?? `node-${index}`, scene)
            : new TransformNode(node.name ?? `node-${index}`, scene);
        transform.metadata = {
            nodeIndex: index,
            selectable: node.extensions?.KHR_node_selectability?.selectable ?? true,
            hoverable: node.extensions?.KHR_node_hoverability?.hoverable ?? true,
        };
        transform.position.fromArray(node.translation ?? [0, 0, 0]);
        transform.scaling.fromArray(node.scale ?? [1, 1, 1]);
        transform.rotationQuaternion = Quaternion.FromArray(node.rotation ?? [0, 0, 0, 1]);
        if (transform instanceof BabylonMesh && materialIndex !== undefined) {
            transform.material = materials[materialIndex];
        }
        return transform;
    });

    (gltf.nodes ?? []).forEach((node: any, index: number) => {
        for (const childIndex of node.children ?? []) {
            nodes[childIndex].parent = nodes[index];
        }
    });

    return {
        glTFNodes: nodes,
        materials,
        animations: [],
        meshes: nodes.filter((node: TransformNode) => node instanceof BabylonMesh),
    };
}
