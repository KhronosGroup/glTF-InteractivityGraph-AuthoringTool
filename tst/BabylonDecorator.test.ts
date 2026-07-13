import { BasicBehaveEngine } from "../src/BasicBehaveEngine/BasicBehaveEngine";
import { BabylonDecorator } from "../src/decorators/BabylonDecorator";
import { BabylonScene, NullEngine } from "./assets/babylonAssetHarness";
import { TestEventBus } from "./assets/sampleAssetHarness";

describe("BabylonDecorator", () => {
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
