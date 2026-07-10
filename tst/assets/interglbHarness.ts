import { ADecorator } from "../../src/BasicBehaveEngine/ADecorator";
import { BasicBehaveEngine } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import {
    assertAssetSubTest,
    formatError,
    getAssetSubTests,
    loadAssetCases,
    runGraphsAndWait,
} from "./sampleAssetHarness";

export const interGlbPairCases = loadInterGlbPairCases();

export interface InterGlbRunState {
    variablesByAsset: Map<string, BasicBehaveEngine["variables"]>;
    runError?: Error;
}

export function shouldRunInterGlbSuite(): boolean {
    const nameFilter = process.env.KHR_INTERACTIVITY_ASSET_NAME_FILTER;
    const filter = process.env.KHR_INTERACTIVITY_ASSET_FILTER;

    if (nameFilter) {
        return interGlbPairCases.some((assetCase) => assetCase.entry.name === nameFilter);
    }
    if (filter) {
        return interGlbPairCases.some((assetCase) => (
            assetCase.entry.name.includes(filter)
            || assetCase.entry.label.includes(filter)
            || assetCase.entry.tags.includes(filter)
        ));
    }
    return true;
}

export function createInterGlbRunState(): InterGlbRunState {
    return { variablesByAsset: new Map() };
}

export async function runInterGlbPair(
    state: InterGlbRunState,
    engines: BasicBehaveEngine[],
    decorators: ADecorator[],
): Promise<void> {
    const loadErrorCase = interGlbPairCases.find((assetCase) => assetCase.loadError);
    if (loadErrorCase?.loadError) {
        state.runError = loadErrorCase.loadError;
        return;
    }

    try {
        await runGraphsAndWait(decorators, interGlbPairCases.map((assetCase) => assetCase.graph));
        interGlbPairCases.forEach((assetCase, index) => state.variablesByAsset.set(assetCase.entry.name, engines[index].variables));
    } catch (error) {
        state.runError = error instanceof Error ? error : new Error(String(error));
    }
}

export function assertInterGlbPairSubTests(state: InterGlbRunState): void {
    describe.each(interGlbPairCases)("$entry.name", (assetCase) => {
        const subTests = getAssetSubTests(assetCase.metadata);

        it.each(subTests)("$displayName", ({ subTest }) => {
            if (state.runError) {
                throw new Error(`InterGlb pair did not load or execute, so all ${totalInterGlbSubTests()} subtest(s) fail:\n${formatError(state.runError)}`);
            }

            assertAssetSubTest(assetCase.entry.name, state.variablesByAsset.get(assetCase.entry.name) ?? [], subTest);
        });
    });
}

function loadInterGlbPairCases() {
    const cases = loadAssetCases({ interGlb: "only", applyEnvFilters: false });
    return ["InterGlb/RefEcho_FileA", "InterGlb/RefEcho_FileB"].map((name) => {
        const assetCase = cases.find((candidate) => candidate.entry.name === name);
        if (!assetCase) {
            throw new Error(`Missing required InterGlb asset case ${name}`);
        }
        return assetCase;
    });
}

function totalInterGlbSubTests(): number {
    return interGlbPairCases.reduce((sum, assetCase) => sum + getAssetSubTests(assetCase.metadata).length, 0);
}
