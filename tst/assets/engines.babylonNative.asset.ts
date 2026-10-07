import { jest } from "@jest/globals";
import type { IInteractivityVariable } from "../../src/BasicBehaveEngine/types/InteractivityGraph";
import { getDefaultGraphImportResult, readNativeVariables } from "../../src/components/engineViews/babylonNativeInteractivity";
import { BabylonScene, loadGlbForNativeInteractivity, NullEngine, disposeBabylonScene } from "./babylonAssetHarness";
import {
    assertAssetSubTest,
    formatError,
    getAssetSubTests,
    getGraphSettleSeconds,
    loadAssetCases,
    renderFramesWhileWaiting,
    splitAssetSubTests,
    TestRunSignals,
} from "./sampleAssetHarness";

jest.setTimeout(30_000);

const cases = loadAssetCases({ interGlb: "exclude" });

// Runs the sample assets with Babylon.js' own KHR_interactivity runtime (the Babylon Native
// view), against the same expectations as the BasicBehaveEngine runs.
describe("KHR_interactivity sample assets - Babylon native runtime", () => {
    if (cases.length === 0) {
        it.skip("has no matching single-file assets", () => {});
        return;
    }

    describe.each(cases)("$entry.name", (assetCase) => {
        const { automatic: subTests, manual: manualSubTests } = splitAssetSubTests(getAssetSubTests(assetCase.metadata));
        let variables: IInteractivityVariable[] = [];
        let runError: Error | undefined;

        beforeAll(async () => {
            if (assetCase.loadError) {
                runError = assetCase.loadError;
                return;
            }

            const nullEngine = new NullEngine();
            const scene = new BabylonScene(nullEngine);
            try {
                await loadGlbForNativeInteractivity(assetCase.glbPath, scene);
                const graphResult = getDefaultGraphImportResult(scene);
                if (!graphResult?.flowGraph || !graphResult.coordinator) {
                    const messages = graphResult?.diagnostics.map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`) ?? [];
                    throw new Error(`Babylon rejected the graph:\n${messages.join("\n")}`);
                }

                // registered before starting: test/onStart is sent from the first tick
                const signals: TestRunSignals = { finished: false };
                const coordinator = graphResult.coordinator;
                coordinator.getCustomEventObservable("test/onStart").add((data: any) => {
                    const seconds = Number(data?.expectedDuration);
                    if (Number.isFinite(seconds) && seconds > 0) {
                        signals.expectedSeconds = Math.max(signals.expectedSeconds ?? 0, seconds);
                    }
                });
                const finish = () => { signals.finished = true; };
                coordinator.getCustomEventObservable("test/onSuccess").add(finish);
                coordinator.getCustomEventObservable("test/onFailed").add(finish);
                coordinator.start();

                const waitMs = Math.max(20, Math.ceil(getGraphSettleSeconds(assetCase.graph) * 1000));
                // beginFrame measures the frame time FlowGraph ticks and delays advance by
                await renderFramesWhileWaiting(() => {
                    nullEngine.beginFrame();
                    scene.render();
                    nullEngine.endFrame();
                }, waitMs, signals);
                variables = readNativeVariables(graphResult.flowGraph, assetCase.graph);
            } catch (error) {
                runError = error instanceof Error ? error : new Error(String(error));
            } finally {
                await disposeBabylonScene(scene, nullEngine);
            }
        });

        if (subTests.length > 0) {
            it.each(subTests)("$displayName", ({ subTest }) => {
                if (runError) {
                    throw new Error(`${assetCase.entry.name} did not load or execute, so all ${subTests.length} subtest(s) fail:\n${formatError(runError)}`);
                }

                assertAssetSubTest(assetCase.entry.name, variables, subTest);
            });
        }

        if (manualSubTests.length > 0) {
            it.skip.each(manualSubTests)("$displayName", () => {});
        }
    });
});
