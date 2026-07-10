import fs from "fs";
import path from "path";
import { jest } from "@jest/globals";
import { BasicBehaveEngine } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import {
    assertAssetSubTest,
    AssetTestMetadata,
    createGenericWorldFromGltf,
    formatError,
    getAssetSubTests,
    getSampleAssetsRoot,
    GenericTestDecorator,
    readGlbJson,
    runGraphAndWait,
    TestEventBus,
} from "./sampleAssetHarness";

jest.setTimeout(30_000);

const overviewCase = loadOverviewCase();
const subTests = getAssetSubTests(overviewCase.metadata);
const describeIfEnabled = shouldRunOverviewSuite() ? describe : describe.skip;

describeIfEnabled("KHR_interactivity Overview asset - core engine", () => {
    let variables: BasicBehaveEngine["variables"] = [];
    let runError: Error | undefined;

    beforeAll(async () => {
        if (overviewCase.loadError) {
            runError = overviewCase.loadError;
            return;
        }

        try {
            const eventBus = new TestEventBus();
            const engine = new BasicBehaveEngine(60, eventBus);
            const decorator = new GenericTestDecorator(engine, createGenericWorldFromGltf(overviewCase.gltf));

            await runGraphAndWait(decorator, overviewCase.graph);
            variables = engine.variables;
        } catch (error) {
            runError = error instanceof Error ? error : new Error(String(error));
        }
    });

    it.each(subTests)("$displayName", ({ subTest }) => {
        if (runError) {
            throw new Error(`Overview did not load or execute, so all ${subTests.length} subtest(s) fail:\n${formatError(runError)}`);
        }

        assertAssetSubTest("Overview", variables, subTest);
    });
});

function shouldRunOverviewSuite(): boolean {
    const nameFilter = process.env.KHR_INTERACTIVITY_ASSET_NAME_FILTER;
    const filter = process.env.KHR_INTERACTIVITY_ASSET_FILTER;

    if (nameFilter) {
        return nameFilter === "Overview";
    }
    if (filter) {
        return "Overview".includes(filter);
    }
    return true;
}

function loadOverviewCase(): { metadata: AssetTestMetadata; gltf?: any; graph?: any; loadError?: Error } {
    const root = path.join(getSampleAssetsRoot(), "Tests", "Interactivity");
    const metadataPath = path.join(root, "Overview.json");
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as AssetTestMetadata;

    try {
        const gltf = readGlbJson(path.join(root, metadata.glbFileName));
        const interactivity = gltf.extensions?.KHR_interactivity;
        const graphIndex = interactivity?.graph ?? 0;
        const graph = interactivity?.graphs?.[graphIndex];

        if (!graph) {
            throw new Error(`No KHR_interactivity graph found in ${metadata.glbFileName}`);
        }

        return { metadata, gltf, graph };
    } catch (error) {
        return { metadata, loadError: error instanceof Error ? error : new Error(String(error)) };
    }
}
