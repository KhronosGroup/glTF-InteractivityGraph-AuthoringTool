import { jest } from "@jest/globals";
import { BasicBehaveEngine } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import {
    assertInterGlbPairSubTests,
    createInterGlbRunState,
    interGlbPairCases,
    runInterGlbPair,
    shouldRunInterGlbSuite,
} from "./interglbHarness";
import {
    createGenericWorldFromGltf,
    GenericTestDecorator,
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
            new GenericTestDecorator(engines[index], createGenericWorldFromGltf(assetCase.gltf))
        ));

        await runInterGlbPair(state, engines, decorators);
    });

    assertInterGlbPairSubTests(state);
});
