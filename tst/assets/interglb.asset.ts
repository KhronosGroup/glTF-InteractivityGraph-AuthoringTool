import { jest } from "@jest/globals";
import { BasicBehaveEngine } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import { createGlTFObjectModelFromGltf, GlTFObjectModelDecorator } from "../../src/objectModel/glTFObjectModel";
import {
    assertInterGlbPairSubTests,
    createInterGlbRunState,
    interGlbPairCases,
    runInterGlbPair,
    shouldRunInterGlbSuite,
} from "./interglbHarness";
import {
    TestEventBus,
} from "./sampleAssetHarness";

jest.setTimeout(30_000);

const describeIfEnabled = shouldRunInterGlbSuite() ? describe : describe.skip;

describeIfEnabled("KHR_interactivity InterGlb paired assets - core engine", () => {
    const state = createInterGlbRunState();

    beforeAll(async () => {
        const eventBus = new TestEventBus();
        const engines = interGlbPairCases.map(() => new BasicBehaveEngine(60, eventBus));
        const decorators = interGlbPairCases.map((assetCase, index) => (
            new GlTFObjectModelDecorator(engines[index], createGlTFObjectModelFromGltf(assetCase.gltf))
        ));

        await runInterGlbPair(state, engines, decorators);
    });

    assertInterGlbPairSubTests(state);
});
