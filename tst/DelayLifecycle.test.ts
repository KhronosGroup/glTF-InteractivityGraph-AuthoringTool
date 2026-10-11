import { jest } from "@jest/globals";
import { BasicBehaveEngine } from "../src/BasicBehaveEngine/BasicBehaveEngine";
import { DOMEventBus } from "../src/BasicBehaveEngine/eventBuses/DOMEventBus";
import { SetDelay } from "../src/BasicBehaveEngine/nodes/flow/SetDelay";
import { standardTypes } from "../src/authoring/spec/nodes";

function createDelay(duration: number) {
    const engine = new BasicBehaveEngine(60, new DOMEventBus());
    const node = new SetDelay({
        index: 0,
        declaration: { op: "flow/setDelay" },
        graphEngine: engine,
        idToBehaviourNodeMap: new Map(),
        types: standardTypes,
        variables: [],
        events: [],
        configuration: {},
        addEventToWorkQueue: jest.fn(),
        values: { duration: { type: 2, value: [duration] } },
        flows: { out: { node: 1 }, done: { node: 2 }, err: { node: 3 } },
    });
    node.processFlow = jest.fn() as typeof node.processFlow;
    node.addEventToWorkQueue = jest.fn() as typeof node.addEventToWorkQueue;
    return { engine, node };
}

describe("delay bounds and ownership", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());
    it.each([2147483.648, Number.MAX_VALUE, Infinity, NaN, -1])(
        "routes duration %s to err without a wrapped timer",
        (duration) => {
            const { engine, node } = createDelay(duration);
            try {
                node.processNode("in");
                expect(node.processFlow).toHaveBeenCalledWith({ node: 3 });
                expect(node.outValues.lastDelay.value).toEqual([null]);
                expect(engine.scheduledDelays).toHaveLength(0);
                expect(jest.getTimerCount()).toBe(0);
            } finally {
                engine.dispose();
            }
        },
    );
    it("accepts the largest representable timer duration", () => {
        const { engine, node } = createDelay(2147483.647);
        try {
            node.processNode("in");
            expect(node.processFlow).toHaveBeenCalledWith({ node: 1 });
            expect(engine.getScheduledDelay(0)).toBeDefined();
            expect(node.outValues.lastDelay.value).toEqual([
                "/extensions/KHR_interactivity/delays/0",
            ]);
            expect(jest.getTimerCount()).toBe(1);
        } finally {
            engine.dispose();
        }
    });
    it.each(["completion", "cancellation", "dispose"])(
        "removes delay references from the graph and owner on %s",
        (mode) => {
            const { engine, node } = createDelay(0.02);
            node.processNode("in");
            expect(node._runningDelayIndices).toEqual([0]);
            if (mode === "completion") jest.advanceTimersByTime(20);
            else if (mode === "cancellation") engine.cancelScheduledDelay(0);
            else engine.dispose();
            expect(node._runningDelayIndices).toEqual([]);
            expect(engine.getScheduledDelay(0)).toBeUndefined();
            expect(
                engine.isValidJsonPtr("/extensions/KHR_interactivity/delays/0"),
            ).toBe(false);
            expect(node.addEventToWorkQueue).toHaveBeenCalledTimes(
                mode === "completion" ? 1 : 0,
            );
            expect(jest.getTimerCount()).toBe(0);
            engine.dispose();
        },
    );
});
