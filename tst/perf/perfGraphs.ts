import {BasicBehaveEngine} from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import {DOMEventBus} from "../../src/BasicBehaveEngine/eventBuses/DOMEventBus";

export const T = {bool: 0, int: 1, float: 2, float2: 3, float3: 4, float4: 5, float4x4: 6, ref: 7} as const;
const TYPE_SIGNATURES = ["bool", "int", "float", "float2", "float3", "float4", "float4x4", "ref"];

export type Val = {type: number, value: any[]} | {node: number, socket: string};
export const lit = (type: number, ...value: any[]): Val => ({type, value});
export const out = (node: number, socket = "value"): Val => ({node, socket});

export class GraphBuilder {
    private declarations: {op: string}[] = [];
    private declIndex = new Map<string, number>();
    private nodes: any[] = [];
    private variables: {type: number, value: any[]}[] = [];
    private events: any[] = [];

    get nodeCount() {
        return this.nodes.length;
    }

    node(op: string, values: Record<string, Val> = {}, configuration: Record<string, any[]> = {}): number {
        let decl = this.declIndex.get(op);
        if (decl === undefined) {
            decl = this.declarations.length;
            this.declarations.push({op});
            this.declIndex.set(op, decl);
        }
        const config: Record<string, {value: any[]}> = {};
        for (const [key, value] of Object.entries(configuration)) {
            config[key] = {value};
        }
        this.nodes.push({declaration: decl, values, configuration: config, flows: {}});
        return this.nodes.length - 1;
    }

    flow(from: number, socket: string, to: number, toSocket = "in") {
        this.nodes[from].flows[socket] = {node: to, socket: toSocket};
    }

    variable(type: number, value: any[]): number {
        this.variables.push({type, value});
        return this.variables.length - 1;
    }

    event(id: string, values: Record<string, number>): number {
        const vals: Record<string, {type: number}> = {};
        for (const [key, type] of Object.entries(values)) {
            vals[key] = {type};
        }
        this.events.push({id, values: vals});
        return this.events.length - 1;
    }

    // add(variable/get v, literal) -> variable/set v; returns the variable/set node
    incrementVariable(variable: number, amount: Val): number {
        const get = this.node("variable/get", {}, {variable: [variable]});
        const add = this.node("math/add", {a: out(get), b: amount});
        return this.node("variable/set", {[variable]: out(add)}, {variables: [variable]});
    }

    /** Fresh JSON copy: the engine mutates variables and node values while it runs. */
    build(): any {
        return JSON.parse(JSON.stringify({
            types: TYPE_SIGNATURES.map(signature => ({signature})),
            declarations: this.declarations,
            nodes: this.nodes,
            variables: this.variables,
            events: this.events,
        }));
    }
}

export interface PerfGraph {
    graph: any;
    unit: string;
    unitsPerTick: number;
    registerPointers?: (engine: BasicBehaveEngine) => void;
    /** Throws if the engine state after `ticks` executed ticks is wrong. */
    verify: (engine: BasicBehaveEngine, ticks: number) => void;
}

/** Loads without running, then performs the first tick (onStart + onTick). */
export const createEngine = (g: PerfGraph): BasicBehaveEngine => {
    const engine = new BasicBehaveEngine(60, new DOMEventBus());
    g.registerPointers?.(engine);
    engine.loadBehaveGraph(g.graph, false);
    engine.executeEventQueueTick();
    return engine;
};

const expectClose = (label: string, actual: number, expected: number, tolerance = 1e-9) => {
    if (!(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)))) {
        throw new Error(`${label}: expected ${expected}, got ${actual}`);
    }
};

const expectEqual = (label: string, actual: unknown, expected: unknown) => {
    if (actual !== expected) {
        throw new Error(`${label}: expected ${expected}, got ${actual}`);
    }
};

const variableValue = (engine: BasicBehaveEngine, index: number) => engine.variables[index].value![0];

// --- graphs -------------------------------------------------------------------------------------

/** A single onTick with no work: the fixed per-tick cost of the engine loop. */
export const idleTick = (): PerfGraph => {
    const b = new GraphBuilder();
    b.node("event/onTick");
    return {graph: b.build(), unit: "tick", unitsPerTick: 1, verify: () => undefined};
};

/** x = x * 0.5 + 1, `depth` times, pulled by one variable/set: deep linear float chain. */
export const mathChainFloat = (depth: number): PerfGraph => {
    const b = new GraphBuilder();
    const v = b.variable(T.float, [0]);
    const tick = b.node("event/onTick");
    let prev = b.node("variable/get", {}, {variable: [v]});
    for (let i = 0; i < depth; i++) {
        const mul = b.node("math/mul", {a: out(prev), b: lit(T.float, 0.5)});
        prev = b.node("math/add", {a: out(mul), b: lit(T.float, 1)});
    }
    const set = b.node("variable/set", {[v]: out(prev)}, {variables: [v]});
    b.flow(tick, "out", set);
    return {
        graph: b.build(), unit: "math node", unitsPerTick: depth * 2,
        verify: (engine, ticks) => {
            let x = 0;
            for (let t = 0; t < ticks; t++) for (let i = 0; i < depth; i++) x = x * 0.5 + 1;
            expectClose("mathChainFloat", variableValue(engine, v), x);
        },
    };
};

/** Mixed float/float3 stages (sin, cos, combine3, normalize, dot, extract3 x2 sockets, mul, add). */
export const mixedVectorMath = (stages: number): PerfGraph => {
    const b = new GraphBuilder();
    const v = b.variable(T.float, [0.3]);
    const tick = b.node("event/onTick");
    const k = [0.2, 0.3, 0.4];
    let s = b.node("variable/get", {}, {variable: [v]});
    for (let i = 0; i < stages; i++) {
        const sn = b.node("math/sin", {a: out(s)});
        const cs = b.node("math/cos", {a: out(s)});
        const v3 = b.node("math/combine3", {a: out(sn), b: out(cs), c: out(s)});
        const n = b.node("math/normalize", {a: out(v3)});
        const d = b.node("math/dot", {a: out(n), b: lit(T.float3, ...k)});
        const e = b.node("math/extract3", {a: out(n)});
        const m = b.node("math/mul", {a: out(e, "0"), b: out(e, "1")});
        s = b.node("math/add", {a: out(d), b: out(m)});
    }
    const set = b.node("variable/set", {[v]: out(s)}, {variables: [v]});
    b.flow(tick, "out", set);
    return {
        graph: b.build(), unit: "math node", unitsPerTick: stages * 8,
        verify: (engine, ticks) => {
            let x = 0.3;
            for (let t = 0; t < ticks; t++) {
                for (let i = 0; i < stages; i++) {
                    const a = [Math.sin(x), Math.cos(x), x];
                    const len = Math.hypot(a[0], a[1], a[2]);
                    const n = a.map(c => c / len);
                    x = (n[0] * k[0] + n[1] * k[1] + n[2] * k[2]) + n[0] * n[1];
                }
            }
            expectClose("mixedVectorMath", variableValue(engine, v), x, 1e-6);
        },
    };
};

/** x_{i+1} = x_i + x_i: every node is read twice, so this is exponential without the evaluation cache. */
export const sharedSubexpression = (depth: number): PerfGraph => {
    const b = new GraphBuilder();
    const v = b.variable(T.float, [1]);
    const tick = b.node("event/onTick");
    let prev = b.node("variable/get", {}, {variable: [v]});
    for (let i = 0; i < depth; i++) {
        prev = b.node("math/add", {a: out(prev), b: out(prev)});
    }
    const scaled = b.node("math/mul", {a: out(prev), b: lit(T.float, Math.pow(2, -depth))});
    const set = b.node("variable/set", {[v]: out(scaled)}, {variables: [v]});
    b.flow(tick, "out", set);
    return {
        graph: b.build(), unit: "math node", unitsPerTick: depth + 1,
        verify: (engine) => expectClose("sharedSubexpression", variableValue(engine, v), 1),
    };
};

/** `count` chained variable/set nodes, each v_i = v_i + 1. */
export const variableSetGetChain = (count: number): PerfGraph => {
    const b = new GraphBuilder();
    const tick = b.node("event/onTick");
    const vars: number[] = [];
    let prevSet = -1;
    for (let i = 0; i < count; i++) {
        const v = b.variable(T.int, [0]);
        vars.push(v);
        const set = b.incrementVariable(v, lit(T.int, 1));
        b.flow(prevSet === -1 ? tick : prevSet, "out", set);
        prevSet = set;
    }
    return {
        graph: b.build(), unit: "var set+get", unitsPerTick: count,
        verify: (engine, ticks) => vars.forEach(v => expectEqual(`variable ${v}`, variableValue(engine, v), ticks)),
    };
};

/** One variable/set writing `count` variables at once, each from its own variable/get + 1. */
export const variableMultiSet = (count: number): PerfGraph => {
    const b = new GraphBuilder();
    const tick = b.node("event/onTick");
    const vars: number[] = [];
    const values: Record<string, Val> = {};
    for (let i = 0; i < count; i++) {
        const v = b.variable(T.float, [0]);
        vars.push(v);
        const get = b.node("variable/get", {}, {variable: [v]});
        values[v] = out(b.node("math/add", {a: out(get), b: lit(T.float, 1)}));
    }
    const set = b.node("variable/set", values, {variables: vars});
    b.flow(tick, "out", set);
    return {
        graph: b.build(), unit: "variable", unitsPerTick: count,
        verify: (engine, ticks) => vars.forEach(v => expectEqual(`variable ${v}`, variableValue(engine, v), ticks)),
    };
};

const translationWorld = (count: number) => {
    const world: number[][] = Array.from({length: count}, () => [0, 0, 0]);
    const registerPointers = (engine: BasicBehaveEngine) => {
        // index segment `count` makes /nodes/0..count-1/translation valid
        engine.registerJsonPointer(`/nodes/${count}/translation`,
            (path) => world[Number(path.split("/")[2])],
            (path, value) => { world[Number(path.split("/")[2])] = value; },
            "float3", false);
    };
    const verify = (ticks: number) => world.forEach((t, i) => expectEqual(`/nodes/${i}/translation[0]`, t[0], ticks));
    return {registerPointers, verify};
};

/** `count` chained pointer/set(/nodes/i/translation, pointer/get(same) + [1,0,0]) with literal pointers. */
export const pointerConstChain = (count: number): PerfGraph => {
    const b = new GraphBuilder();
    const world = translationWorld(count);
    const tick = b.node("event/onTick");
    let prevSet = -1;
    for (let i = 0; i < count; i++) {
        const pointer = [`/nodes/${i}/translation`];
        const get = b.node("pointer/get", {}, {pointer, type: [T.float3]});
        const add = b.node("math/add", {a: out(get), b: lit(T.float3, 1, 0, 0)});
        const set = b.node("pointer/set", {value: out(add)}, {pointer, type: [T.float3]});
        b.flow(prevSet === -1 ? tick : prevSet, "out", set);
        prevSet = set;
    }
    return {
        graph: b.build(), unit: "ptr get+set", unitsPerTick: count,
        registerPointers: world.registerPointers,
        verify: (_, ticks) => world.verify(ticks),
    };
};

/** flow/for over `count` objects: pointer/set(/nodes/[i]/translation, pointer/get(same) + [1,0,0]). */
export const pointerTemplatedLoop = (count: number): PerfGraph => {
    const b = new GraphBuilder();
    const world = translationWorld(count);
    const tick = b.node("event/onTick");
    const loop = b.node("flow/for", {startIndex: lit(T.int, 0), endIndex: lit(T.int, count)});
    const pointer = ["/nodes/[i]/translation"];
    const get = b.node("pointer/get", {i: out(loop, "index")}, {pointer, type: [T.float3]});
    const add = b.node("math/add", {a: out(get), b: lit(T.float3, 1, 0, 0)});
    const set = b.node("pointer/set", {i: out(loop, "index"), value: out(add)}, {pointer, type: [T.float3]});
    b.flow(tick, "out", loop);
    b.flow(loop, "loopBody", set);
    return {
        graph: b.build(), unit: "ptr get+set", unitsPerTick: count,
        registerPointers: world.registerPointers,
        verify: (_, ticks) => world.verify(ticks),
    };
};

/**
 * flow/for sends `sends` custom events per tick carrying the loop index; `receivers` event/receive nodes
 * each accumulate it into one int variable. Events dispatched in a tick are delivered on the next one.
 */
export const customEvents = (sends: number, receivers: number): PerfGraph => {
    const b = new GraphBuilder();
    const event = b.event("perfEvent", {x: T.int});
    const sum = b.variable(T.int, [0]);
    const tick = b.node("event/onTick");
    const loop = b.node("flow/for", {startIndex: lit(T.int, 0), endIndex: lit(T.int, sends)});
    const send = b.node("event/send", {x: out(loop, "index")}, {event: [event]});
    b.flow(tick, "out", loop);
    b.flow(loop, "loopBody", send);
    for (let r = 0; r < receivers; r++) {
        const receive = b.node("event/receive", {}, {event: [event]});
        const set = b.incrementVariable(sum, out(receive, "x"));
        b.flow(receive, "out", set);
    }
    const perTick = receivers * sends * (sends - 1) / 2;
    return {
        graph: b.build(), unit: "event delivery", unitsPerTick: sends * receivers,
        verify: (engine, ticks) => expectEqual("event sum", variableValue(engine, sum), (ticks - 1) * perTick),
    };
};

/** flow/for with `iterations` loop bodies: rem/eq -> flow/branch -> one of two variable increments. */
export const flowLoopBranch = (iterations: number): PerfGraph => {
    const b = new GraphBuilder();
    const even = b.variable(T.int, [0]);
    const odd = b.variable(T.int, [0]);
    const tick = b.node("event/onTick");
    const loop = b.node("flow/for", {startIndex: lit(T.int, 0), endIndex: lit(T.int, iterations)});
    const rem = b.node("math/rem", {a: out(loop, "index"), b: lit(T.int, 2)});
    const isEven = b.node("math/eq", {a: out(rem), b: lit(T.int, 0)});
    const branch = b.node("flow/branch", {condition: out(isEven)});
    const setEven = b.incrementVariable(even, lit(T.int, 1));
    const setOdd = b.incrementVariable(odd, lit(T.int, 1));
    b.flow(tick, "out", loop);
    b.flow(loop, "loopBody", branch);
    b.flow(branch, "true", setEven);
    b.flow(branch, "false", setOdd);
    return {
        graph: b.build(), unit: "iteration", unitsPerTick: iterations,
        verify: (engine, ticks) => {
            expectEqual("even", variableValue(engine, even), ticks * Math.ceil(iterations / 2));
            expectEqual("odd", variableValue(engine, odd), ticks * Math.floor(iterations / 2));
        },
    };
};

/** flow/sequence with `width` outputs, each into a short chain of variable increments. */
export const sequenceFanOut = (width: number, depth: number): PerfGraph => {
    const b = new GraphBuilder();
    const v = b.variable(T.int, [0]);
    const tick = b.node("event/onTick");
    const seq = b.node("flow/sequence");
    b.flow(tick, "out", seq);
    for (let w = 0; w < width; w++) {
        let prev = -1;
        for (let d = 0; d < depth; d++) {
            const set = b.incrementVariable(v, lit(T.int, 1));
            if (prev === -1) {
                b.flow(seq, `f${String(w).padStart(4, "0")}`, set);
            } else {
                b.flow(prev, "out", set);
            }
            prev = set;
        }
    }
    return {
        graph: b.build(), unit: "var set", unitsPerTick: width * depth,
        verify: (engine, ticks) => expectEqual("sequence sum", variableValue(engine, v), ticks * width * depth),
    };
};
