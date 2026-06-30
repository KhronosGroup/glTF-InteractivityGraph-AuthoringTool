import { jest } from "@jest/globals";
import { BasicBehaveEngine } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import {
    assertAssetSubTest,
    createGenericWorldFromGltf,
    formatError,
    getAssetSubTests,
    GenericTestDecorator,
    loadAssetCases,
    runGraphAndWait,
    TestEventBus,
} from "./sampleAssetHarness";

jest.setTimeout(30_000);

const cases = loadAssetCases();

describe("KHR_interactivity sample assets - core engine", () => {
    describe.each(cases)("$entry.name", (assetCase) => {
        const subTests = getAssetSubTests(assetCase.metadata);
        let variables: BasicBehaveEngine["variables"] = [];
        let runError: Error | undefined;

        beforeAll(async () => {
            if (assetCase.loadError) {
                runError = assetCase.loadError;
                return;
            }

            try {
                const eventBus = new TestEventBus();
                const engine = new BasicBehaveEngine(60, eventBus);
                const decorator = new GenericTestDecorator(engine, createGenericWorldFromGltf(assetCase.gltf));

                await runGraphAndWait(decorator, assetCase.graph);
                variables = engine.variables;
            } catch (error) {
                runError = error instanceof Error ? error : new Error(String(error));
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
