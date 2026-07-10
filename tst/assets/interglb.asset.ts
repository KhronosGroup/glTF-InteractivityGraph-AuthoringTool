import { jest } from "@jest/globals";
import { ADecorator } from "../../src/BasicBehaveEngine/ADecorator";
import { BasicBehaveEngine } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import { BabylonDecorator } from "../../src/decorators/BabylonDecorator";
import { BabylonScene, createBabylonWorld, NullEngine } from "./babylonAssetHarness";
import {
    assertAssetSubTest,
    createGenericWorldFromGltf,
    formatError,
    getAssetSubTests,
    GenericTestDecorator,
    loadAssetCases,
    runGraphsAndWait,
    TestEventBus,
} from "./sampleAssetHarness";

jest.setTimeout(30_000);

const pairCases = getInterGlbPairCases();
const describeIfEnabled = shouldRunInterGlbSuite() ? describe : describe.skip;

describeIfEnabled("KHR_interactivity InterGlb paired assets", () => {
    describe("core engine", () => {
        const state = createRunState();

        beforeAll(async () => {
            const eventBus = new TestEventBus();
            const engines = pairCases.map(() => new BasicBehaveEngine(60, eventBus));
            const decorators = pairCases.map((assetCase, index) => (
                new GenericTestDecorator(engines[index], createGenericWorldFromGltf(assetCase.gltf))
            ));

            await runPair(state, engines, decorators);
        });

        assertPairSubTests(state);
    });

    describe("Babylon engine", () => {
        const state = createRunState();

        beforeAll(async () => {
            const eventBus = new TestEventBus();
            const nullEngine = new NullEngine();
            const scene = new BabylonScene(nullEngine);

            try {
                const engines = pairCases.map(() => new BasicBehaveEngine(60, eventBus));
                const decorators = pairCases.map((assetCase, index) => (
                    new BabylonDecorator(engines[index], createBabylonWorld(assetCase.gltf, scene), scene)
                ));

                await runPair(state, engines, decorators);
                decorators.forEach((decorator) => decorator.dispose());
            } finally {
                scene.dispose();
                nullEngine.dispose();
            }
        });

        assertPairSubTests(state);
    });
});

function getInterGlbPairCases() {
    const cases = loadAssetCases({ interGlb: "only", applyEnvFilters: false });
    return ["InterGlb/RefEcho_FileA", "InterGlb/RefEcho_FileB"].map((name) => {
        const assetCase = cases.find((candidate) => candidate.entry.name === name);
        if (!assetCase) {
            throw new Error(`Missing required InterGlb asset case ${name}`);
        }
        return assetCase;
    });
}

function shouldRunInterGlbSuite(): boolean {
    const nameFilter = process.env.KHR_INTERACTIVITY_ASSET_NAME_FILTER;
    const filter = process.env.KHR_INTERACTIVITY_ASSET_FILTER;

    if (nameFilter) {
        return pairCases.some((assetCase) => assetCase.entry.name === nameFilter);
    }
    if (filter) {
        return pairCases.some((assetCase) => (
            assetCase.entry.name.includes(filter)
            || assetCase.entry.label.includes(filter)
            || assetCase.entry.tags.includes(filter)
        ));
    }
    return true;
}

function createRunState(): { variablesByAsset: Map<string, BasicBehaveEngine["variables"]>; runError?: Error } {
    return { variablesByAsset: new Map() };
}

async function runPair(
    state: { variablesByAsset: Map<string, BasicBehaveEngine["variables"]>; runError?: Error },
    engines: BasicBehaveEngine[],
    decorators: ADecorator[],
): Promise<void> {
    const loadErrorCase = pairCases.find((assetCase) => assetCase.loadError);
    if (loadErrorCase?.loadError) {
        state.runError = loadErrorCase.loadError;
        return;
    }

    try {
        await runGraphsAndWait(decorators, pairCases.map((assetCase) => assetCase.graph));
        pairCases.forEach((assetCase, index) => state.variablesByAsset.set(assetCase.entry.name, engines[index].variables));
    } catch (error) {
        state.runError = error instanceof Error ? error : new Error(String(error));
    }
}

function assertPairSubTests(state: { variablesByAsset: Map<string, BasicBehaveEngine["variables"]>; runError?: Error }): void {
    describe.each(pairCases)("$entry.name", (assetCase) => {
        const subTests = getAssetSubTests(assetCase.metadata);

        it.each(subTests)("$displayName", ({ subTest }) => {
            if (state.runError) {
                throw new Error(`InterGlb pair did not load or execute, so all ${totalInterGlbSubTests()} subtest(s) fail:\n${formatError(state.runError)}`);
            }

            assertAssetSubTest(assetCase.entry.name, state.variablesByAsset.get(assetCase.entry.name) ?? [], subTest);
        });
    });
}

function totalInterGlbSubTests(): number {
    return pairCases.reduce((sum, assetCase) => sum + getAssetSubTests(assetCase.metadata).length, 0);
}
