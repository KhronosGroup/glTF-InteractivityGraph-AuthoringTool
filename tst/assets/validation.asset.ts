import { jest } from "@jest/globals";
import {
    formatError,
    getAssetSubTests,
    loadAssetCases,
    loadOverviewAssetCase,
    validateGraphLoad,
} from "./sampleAssetHarness";

jest.setTimeout(30_000);

const cases = loadValidationCases();

describe("KHR_interactivity sample assets - validation", () => {
    if (cases.length === 0) {
        it.skip("has no matching assets", () => {});
        return;
    }

    it.each(cases)("$entry.name [subtests:$subTestCount]", (assetCase) => {
        try {
            validateGraphLoad(assetCase);
        } catch (error) {
            throw new Error(`${assetCase.entry.name} did not validate:\n${formatError(error)}`);
        }
    });
});

function loadValidationCases() {
    const normalCases = loadAssetCases({ interGlb: "include" }).map(withSubTestCount);
    const overviewCase = loadOverviewAssetCase();
    if (matchesEnvFilter(overviewCase.entry.name, overviewCase.entry.label, overviewCase.entry.tags)) {
        normalCases.push(withSubTestCount(overviewCase));
    }
    return normalCases;
}

function withSubTestCount<T extends { metadata: any }>(assetCase: T): T & { subTestCount: number } {
    return {
        ...assetCase,
        subTestCount: getAssetSubTests(assetCase.metadata).length,
    };
}

function matchesEnvFilter(name: string, label: string, tags: string[]): boolean {
    const nameFilter = process.env.KHR_INTERACTIVITY_ASSET_NAME_FILTER;
    const filter = process.env.KHR_INTERACTIVITY_ASSET_FILTER;

    if (nameFilter) {
        return name === nameFilter;
    }
    if (filter) {
        return name.includes(filter) || label.includes(filter) || tags.includes(filter);
    }
    return true;
}
