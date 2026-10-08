/**
 * BasicBehaveEngine execution benchmarks. Run with `npm run test:perf`.
 * Each case also verifies the engine result, so it doubles as a guard when optimizing.
 * PERF_SAVE_BASELINE=1 stores the run as tst/perf/results/baseline.json; later runs print the speedup against it.
 */
import {jest} from "@jest/globals";
import {BasicBehaveEngine} from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import {DOMEventBus} from "../../src/BasicBehaveEngine/eventBuses/DOMEventBus";
import {BenchResult, reportResults, runBench, runOnce} from "./perfHarness";
import {
    createEngine, customEvents, flowLoopBranch, GraphBuilder, idleTick, lit, mathChainFloat, mixedVectorMath, out, PerfGraph,
    pointerConstChain, pointerTemplatedLoop, sequenceFanOut, sharedSubexpression, T, variableMultiSet, variableSetGetChain,
} from "./perfGraphs";

jest.setTimeout(120_000);

const results: BenchResult[] = [];

const benchGraph = (name: string, make: () => PerfGraph) => {
    it(name, () => {
        const g = make();
        const engine = createEngine(g);
        let ticks = 1;
        try {
            results.push(runBench(name, {
                tick: () => { engine.executeEventQueueTick(); ticks++; },
                unit: g.unit,
                unitsPerTick: g.unitsPerTick,
            }));
            g.verify(engine, ticks);
        } finally {
            engine.dispose();
        }
    });
};

describe("BasicBehaveEngine performance", () => {
    afterAll(() => reportResults(results));

    benchGraph("idle tick", idleTick);

    benchGraph("math chain float (400 nodes)", () => mathChainFloat(200));
    benchGraph("mixed vector math (30 stages, 240 nodes)", () => mixedVectorMath(30));
    benchGraph("shared subexpression (40 deep)", () => sharedSubexpression(40));

    benchGraph("variable set/get chain (100)", () => variableSetGetChain(100));
    benchGraph("variable multi-set (64 vars, 1 node)", () => variableMultiSet(64));

    benchGraph("pointer get/set const chain (100)", () => pointerConstChain(100));
    benchGraph("pointer get/set templated for (100)", () => pointerTemplatedLoop(100));
    benchGraph("object model pointer const chain (100)", () => pointerConstChain(100, true));
    benchGraph("object model pointer templated for (100)", () => pointerTemplatedLoop(100, true));

    benchGraph("custom events (50 sends x 2 receivers)", () => customEvents(50, 2));

    benchGraph("for + branch (1000 iterations)", () => flowLoopBranch(1000));
    benchGraph("sequence fan-out (50 x 4 sets)", () => sequenceFanOut(50, 4));

    it("load graph (~2000 nodes)", () => {
        const b = new GraphBuilder();
        const tick = b.node("event/onTick");
        let prev = b.node("variable/get", {}, {variable: [b.variable(T.float, [0])]});
        for (let i = 0; i < 1000; i++) {
            prev = b.node(i % 2 ? "math/add" : "math/mul", {a: out(prev), b: lit(T.float, 1)});
        }
        for (let i = 0; i < 300; i++) {
            const set = b.incrementVariable(b.variable(T.int, [0]), lit(T.int, 1));
            if (i === 0) b.flow(tick, "out", set);
        }
        const graphs = Array.from({length: 7}, () => b.build());
        results.push(runOnce("load graph (~2000 nodes)", "node", b.nodeCount, () => {
            const engine = new BasicBehaveEngine(60, new DOMEventBus());
            engine.loadBehaveGraph(graphs.pop(), false);
            engine.dispose();
        }));
    });
});
