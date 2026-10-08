/**
 * @jest-environment node
 *
 * Runs the PerformanceTest sample asset headless (glTF object model, no renderer): selects load+ until the
 * requested load, presses AUTO and ticks the engine back to back, so the graph's own fps measurement is
 * pure graph throughput. Opt-in (~2 min): PERF_ASSET=1 [PERF_ASSET_LOAD=5] npm run test:perf -- -t "PerformanceTest".
 * Writes tst/perf/results/asset-latest.json; PERF_SAVE_BASELINE=1 also stores asset-baseline.json, which later runs compare against.
 */
import fs from "fs";
import path from "path";
import {jest} from "@jest/globals";
import {BasicBehaveEngine} from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import {createGlTFObjectModelFromGltf, GlTFObjectModelDecorator} from "../../src/objectModel/glTFObjectModel";
import {getSampleAssetsRoot, readGlbJson, TestEventBus} from "../assets/sampleAssetHarness";

const ASSET = path.join(getSampleAssetsRoot(), "Models", "PerformanceTest", "glTF-Binary", "PerformanceTest.glb");
const LOAD = Number(process.env.PERF_ASSET_LOAD ?? 5);
const RESULTS_DIR = path.resolve("tst/perf/results");
const RESULT_LINE = /^PERF \[(\d+)\/(\d+)\] ([A-Z_]+)(?: \(baseline\))?: load (\d+), avg fps ([\d.eE+-]+), avg ms ([\d.eE+-]+), worst ms ([\d.eE+-]+), frames (\d+)/;

interface AssetResult {
    index: number;
    name: string;
    fps: number;
    avgMs: number;
    worstMs: number;
    frames: number;
}

const nodeIndexByName = (gltf: any, name: string): number => {
    const index = (gltf.nodes ?? []).findIndex((node: any) => node.name === name);
    if (index === -1) {
        throw new Error(`PerformanceTest has no node ${name}`);
    }
    return index;
};

const yieldToTimers = () => new Promise((resolve) => setImmediate(resolve));

const run = process.env.PERF_ASSET && fs.existsSync(ASSET) ? it : it.skip;

describe("PerformanceTest asset (headless)", () => {
    run("PerformanceTest auto run", async () => {
        const gltf = readGlbJson(ASSET);
        const interactivity = gltf.extensions.KHR_interactivity;
        const graph = interactivity.graphs[interactivity.graph ?? 0];

        const engine = new BasicBehaveEngine(60, new TestEventBus());
        const decorator = new GlTFObjectModelDecorator(engine, createGlTFObjectModelFromGltf(gltf));
        const logs: string[] = [];
        engine.processDebugLog = (_node, message) => { logs.push(message); };
        // keep console output (e.g. event/receive logging on older engines) out of the measurement
        const consoleLog = jest.spyOn(console, "log").mockImplementation(() => undefined);

        try {
            decorator.loadBehaveGraph(graph, false);
            const tick = async (count = 1) => {
                for (let i = 0; i < count; i++) {
                    engine.executeEventQueueTick();
                    await yieldToTimers();
                }
            };
            const press = async (button: string) => {
                engine.select(nodeIndexByName(gltf, button), 0, undefined, undefined);
                await tick(3);
            };

            await tick(3);
            const startLoad = Number(graph.variables.find((v: any) => v.name === "graph0_load")?.value?.[0] ?? 3);
            for (let load = startLoad; load < LOAD; load++) await press("Button_LoadPlus");
            for (let load = startLoad; load > LOAD; load--) await press("Button_LoadMinus");
            await press("Button_AUTO");

            const deadline = Date.now() + 10 * 60 * 1000;
            while (!logs.some((line) => line.startsWith("PERF AUTO RUN DONE"))) {
                if (Date.now() > deadline) {
                    throw new Error(`auto run did not finish; last log: ${logs[logs.length - 1]}`);
                }
                await tick();
            }
        } finally {
            consoleLog.mockRestore();
            decorator.dispose();
        }

        const results: AssetResult[] = logs.flatMap((line) => {
            const m = RESULT_LINE.exec(line);
            return m ? [{index: Number(m[1]), name: m[3], fps: Number(m[5]), avgMs: Number(m[6]), worstMs: Number(m[7]), frames: Number(m[8])}] : [];
        });
        const loads = new Set(logs.flatMap((line) => RESULT_LINE.exec(line)?.[4] ?? []));
        expect([...loads]).toEqual([String(LOAD)]);
        expect(results.length).toBeGreaterThan(0);

        fs.mkdirSync(RESULTS_DIR, {recursive: true});
        const baselinePath = path.join(RESULTS_DIR, "asset-baseline.json");
        const baseline: AssetResult[] = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, "utf8")) : [];
        const lines = ["", `PerformanceTest headless, load ${LOAD}`, `${"#".padStart(3)}  ${"test".padEnd(16)}${"avg ms".padStart(10)}${"worst ms".padStart(10)}${"fps".padStart(10)}${baseline.length ? "   base ms   speedup" : ""}`];
        for (const r of results) {
            const base = baseline.find((b) => b.name === r.name);
            const compare = base ? `${base.avgMs.toFixed(3).padStart(10)}${(base.avgMs / r.avgMs).toFixed(2).padStart(9)}x` : "";
            lines.push(`${String(r.index).padStart(3)}  ${r.name.padEnd(16)}${r.avgMs.toFixed(3).padStart(10)}${r.worstMs.toFixed(3).padStart(10)}${r.fps.toFixed(0).padStart(10)}${compare}`);
        }
        lines.push(...logs.filter((line) => /^PERF (AUTO RUN SUMMARY|SLOWEST|FASTEST)/.test(line)));
        process.stdout.write(lines.join("\n") + "\n\n");

        fs.writeFileSync(path.join(RESULTS_DIR, "asset-latest.json"), JSON.stringify(results, null, 2));
        if (process.env.PERF_SAVE_BASELINE) {
            fs.writeFileSync(baselinePath, JSON.stringify(results, null, 2));
        }
    }, 15 * 60 * 1000);
});
