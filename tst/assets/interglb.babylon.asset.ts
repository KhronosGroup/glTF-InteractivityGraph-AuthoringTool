import { jest } from "@jest/globals";
import { BasicBehaveEngine } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import { BabylonDecorator } from "../../src/decorators/BabylonDecorator";
import { BabylonScene, createBabylonWorld, NullEngine } from "./babylonAssetHarness";
import {
    assertInterGlbPairSubTests,
    createInterGlbRunState,
    interGlbPairCases,
    runInterGlbPair,
    shouldRunInterGlbSuite,
} from "./interglbHarness";
import { TestEventBus } from "./sampleAssetHarness";

jest.setTimeout(30_000);

const describeIfEnabled = shouldRunInterGlbSuite() ? describe : describe.skip;

describeIfEnabled("KHR_interactivity InterGlb paired assets - Babylon engine", () => {
    const state = createInterGlbRunState();

    beforeAll(async () => {
        const eventBus = new TestEventBus();
        const nullEngine = new NullEngine();
        const scene = new BabylonScene(nullEngine);

        try {
            const engines = interGlbPairCases.map(() => new BasicBehaveEngine(60, eventBus));
            const decorators = interGlbPairCases.map((assetCase, index) => (
                new BabylonDecorator(engines[index], createBabylonWorld(assetCase.gltf, scene), scene)
            ));

            await runInterGlbPair(state, engines, decorators);
            decorators.forEach((decorator) => decorator.dispose());
        } finally {
            scene.dispose();
            nullEngine.dispose();
        }
    });

    assertInterGlbPairSubTests(state);
});
