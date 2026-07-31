import { BasicBehaveEngine } from "../src/BasicBehaveEngine/BasicBehaveEngine";
import { BabylonDecorator } from "../src/decorators/BabylonDecorator";
import { BabylonScene, NullEngine } from "./assets/babylonAssetHarness";
import { TestEventBus } from "./assets/sampleAssetHarness";
import { PBRMaterial } from "@babylonjs/core";
import { buildNormalizedTemplateSet } from "../src/authoring/pointerCatalogue";
import { schemaMaterialPointerTemplates, schemaMaterialPointers } from "./materialPointerFixture";

describe("BabylonDecorator", () => {
    it("implements every schema-defined material pointer", () => {
        const nullEngine = new NullEngine();
        const scene = new BabylonScene(nullEngine);
        const material = new PBRMaterial("material", scene);
        const decorator = new BabylonDecorator(
            new BasicBehaveEngine(60, new TestEventBus()),
            { glTFNodes: [], materials: [material], meshes: [], animations: [] },
            scene,
        );
        try {
            const registered = buildNormalizedTemplateSet(decorator.getRegisteredJsonPointers());
            const missing = [...schemaMaterialPointerTemplates()].filter((path) => !registered.has(path));
            const mismatched = [...schemaMaterialPointers()].flatMap(([path, definition]) => {
                const actual = {
                    typeName: decorator.getPathTypeName(path),
                    readOnly: decorator.isReadOnly(path),
                };
                return actual.typeName === definition.typeName && actual.readOnly === definition.readOnly
                    ? []
                    : [{ path, expected: { typeName: definition.typeName, readOnly: definition.readOnly }, actual }];
            });

            expect(missing).toEqual([]);
            expect(mismatched).toEqual([]);
        } finally {
            decorator.dispose();
            scene.dispose();
            nullEngine.dispose();
        }
    });

    it("does not throw from animation time pointer getters when an animation slot is absent", () => {
        const nullEngine = new NullEngine();
        const scene = new BabylonScene(nullEngine);
        try {
            const world = {
                glTFNodes: [],
                materials: [],
                meshes: [],
                animations: new Array(1),
            };
            const decorator = new BabylonDecorator(new BasicBehaveEngine(60, new TestEventBus()), world, scene);

            expect(decorator.isValidJsonPtr("/animations/0/extensions/KHR_interactivity/minTime")).toBe(true);
            expect(decorator.isValidJsonPtr("/animations/0/extensions/KHR_interactivity/maxTime")).toBe(true);
            expect(decorator.getPathValue("/animations/0/extensions/KHR_interactivity/minTime")).toEqual([NaN]);
            expect(decorator.getPathValue("/animations/0/extensions/KHR_interactivity/maxTime")).toEqual([NaN]);
        } finally {
            scene.dispose();
            nullEngine.dispose();
        }
    });
});
