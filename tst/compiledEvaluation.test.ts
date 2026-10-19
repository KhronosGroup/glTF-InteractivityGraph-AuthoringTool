import { BasicBehaveEngine } from "../src/BasicBehaveEngine/BasicBehaveEngine";
import { BehaveEngineNode } from "../src/BasicBehaveEngine/BehaveEngineNode";
import { TestEventBus } from "./assets/sampleAssetHarness";

const types = ["bool", "int", "float", "float4", "float4x4"].map(
  (signature) => ({ signature }),
);
const literal = (type: number, ...value: any[]) => ({ type, value });
const wire = (node: number, socket = "value") => ({ node, socket });
function fixture() {
  class TestEngine extends BasicBehaveEngine {
    input(id: number, key: string) {
      return this.idToBehaviourNodeMap.get(id)!.values[key];
    }
    run(id: number) {
      this.idToBehaviourNodeMap.get(id)!.processNode("in");
    }
  }
  const engine = new TestEngine(60, new TestEventBus());
  const graph: any = { types, variables: [], declarations: [], nodes: [] };
  const variable = (type: number, value: any[]) =>
    graph.variables.push({ type, value }) - 1;
  const node = (
    op: string,
    values = {},
    config: Record<string, unknown> = {},
    flows = {},
  ) => {
    let declaration = graph.declarations.findIndex((d: any) => d.op === op);
    if (declaration < 0) declaration = graph.declarations.push({ op }) - 1;
    const configuration = Object.fromEntries(
      Object.entries(config).map(([k, v]) => [
        k,
        { value: Array.isArray(v) ? v : [v] },
      ]),
    );
    // spec schema: empty values/configuration/flows are omitted
    const nonEmpty = (entries: Record<string, object>) =>
      Object.fromEntries(
        Object.entries(entries).filter(([, v]) => Object.keys(v).length > 0),
      );
    return (
      graph.nodes.push({
        declaration,
        ...nonEmpty({ values, configuration, flows }),
      }) - 1
    );
  };
  // spec schema: empty top-level arrays are omitted
  const load = () =>
    engine.loadBehaveGraph(
      Object.fromEntries(
        Object.entries(graph).filter(([, v]) => (v as any[]).length > 0),
      ),
      false,
    );
  const run = (id: number) => engine.run(id);
  return { engine, graph, variable, node, load, run };
}

test("compiled bulk writes evaluate all RHS values before mutation and invalidate between activations", () => {
  const f = fixture(),
    a = f.variable(2, [3]),
    b = f.variable(2, [7]);
  const readA = f.node("variable/get", {}, { variable: a }),
    readB = f.node("variable/get", {}, { variable: b });
  const swap = f.node(
    "variable/set",
    { [a]: wire(readB), [b]: wire(readA) },
    { variables: [a, b] },
  );
  try {
    f.load();
    f.run(swap);
    expect(f.engine.variables.map((v) => v.value)).toEqual([[7], [3]]);
    f.run(swap);
    expect(f.engine.variables.map((v) => v.value)).toEqual([[3], [7]]);
    f.graph.variables[a].value = [19];
    f.load();
    f.run(swap);
    expect(f.engine.variables.map((v) => v.value)).toEqual([[7], [19]]);
  } finally {
    f.engine.dispose();
  }
});

test("compiled matrix combine/extract preserves NaN, infinity, signed zero and double precision", () => {
  const f = fixture(),
    output = f.variable(2, [0]);
  const values = Array.from({ length: 16 }, (_, i) => i);
  values[2] = NaN;
  values[3] = Infinity;
  values[4] = -0;
  values[5] = 9007199254740991;
  const source = f.variable(4, values),
    read = f.node("variable/get", {}, { variable: source });
  const extract = f.node("math/extract4x4", { a: wire(read) });
  const combine = f.node(
    "math/combine4x4",
    Object.fromEntries(
      values.map((_, i) => [
        String.fromCharCode(97 + i),
        wire(extract, String(i)),
      ]),
    ),
  );
  const sink = f.node(
    "variable/set",
    { [output]: wire(extract, "5") },
    { variables: [output] },
  );
  try {
    f.load();
    f.run(sink);
    expect(f.engine.variables[output].value).toEqual([9007199254740991]);
    const result = f.engine.getCompiledOutput(combine, "value")!
      .value as number[];
    expect(result).toEqual(values);
    expect(Object.is(result[4], -0)).toBe(true);
  } finally {
    f.engine.dispose();
  }
});

test("integer multiplication uses imul and type-only float literals use NaN defaults", () => {
  const f = fixture(),
    out = f.variable(1, [0]);
  const product = f.node("math/mul", {
    a: literal(1, 2147483647),
    b: literal(1, 2147483647),
  });
  const nan = f.node("math/add", { a: { type: 2 }, b: literal(2, 1) });
  const sink = f.node(
    "variable/set",
    { [out]: wire(product) },
    { variables: [out] },
  );
  try {
    f.load();
    f.run(sink);
    expect(f.engine.variables[out].value).toEqual([1]);
    expect(f.engine.getCompiledOutput(nan, "value")!.value).toBeNaN();
  } finally {
    f.engine.dispose();
  }
});

test("custom operation overrides retain the interpreter", () => {
  class CustomAdd extends BehaveEngineNode {
    override processNode() {
      return { value: { type: 2, value: [99] } };
    }
  }
  const f = fixture(),
    out = f.variable(2, [0]);
  const add = f.node("math/add", { a: literal(2, 1), b: literal(2, 2) });
  const sink = f.node(
    "variable/set",
    { [out]: wire(add) },
    { variables: [out] },
  );
  try {
    f.engine.registerBehaveEngineNode("math/add", CustomAdd);
    f.load();
    f.run(sink);
    expect(f.engine.variables[out].value).toEqual([99]);
    expect(f.engine.getCompiledOutput(add, "value")).toBeUndefined();
  } finally {
    f.engine.dispose();
  }
});

test("compiled decision tables route like branches and keep the per-node path with debug hooks", () => {
  const f = fixture(),
    choice = f.variable(1, [0]),
    result = f.variable(1, [-1]);
  const read = f.node("variable/get", {}, { variable: choice });
  const tree = (lo: number, hi: number): number => {
    if (hi - lo === 1)
      return f.node(
        "variable/set",
        { [result]: literal(1, lo) },
        { variables: [result] },
      );
    const mid = (lo + hi) >> 1,
      condition = f.node("math/lt", { a: wire(read), b: literal(1, mid) });
    // spec: output flows point to later nodes, so the targets are added after the branch
    const branch = f.node("flow/branch", { condition: wire(condition) });
    f.graph.nodes[branch].flows = {
      true: { node: tree(lo, mid), socket: "in" },
      false: { node: tree(mid, hi), socket: "in" },
    };
    return branch;
  };
  const root = tree(0, 8);
  try {
    f.load();
    for (let i = 0; i < 8; i++) {
      f.engine.variables[choice].value = [i];
      f.run(root);
      expect(f.engine.variables[result].value).toEqual([i]);
    }
    // Decision tables must retain the same live-literal behavior as ordinary inputs.
    const rootComparison = f.graph.nodes[root].values.condition.node;
    f.engine.input(rootComparison, "b").value![0] = 0;
    f.engine.variables[choice].value = [1];
    f.run(root);
    expect(f.engine.variables[result].value).toEqual([4]);
    f.engine.input(rootComparison, "b").value = [4];
    f.run(root);
    expect(f.engine.variables[result].value).toEqual([1]);
    const trace: number[] = [];
    f.engine.processNodeStarted = (node) => {
      trace.push(node.index);
    };
    f.engine.variables[choice].value = [5];
    f.run(root);
    expect(f.engine.variables[result].value).toEqual([5]);
    expect(trace).toContain(root);
    expect(trace.length).toBeGreaterThan(3);
  } finally {
    f.engine.dispose();
  }
});

test("compiled readers preserve upstream in-place literal and replacement-array edits", () => {
  const f = fixture();
  const out = f.variable(2, [0]);
  const add = f.node("math/add", { a: literal(2, 1), b: literal(2, 2) });
  const sink = f.node("variable/set", { [out]: wire(add) }, { variables: [out] });
  const direct = f.node("variable/set", { [out]: literal(2, 4) }, { variables: [out] });
  try {
    f.load();
    f.run(sink);
    expect(f.engine.variables[out].value).toEqual([3]);
    f.engine.input(add, "a").value![0] = 7;
    f.engine.clearValueEvaluationCache();
    f.run(sink);
    expect(f.engine.variables[out].value).toEqual([9]);
    f.engine.input(add, "b").value = [8];
    f.engine.clearValueEvaluationCache();
    f.run(sink);
    expect(f.engine.variables[out].value).toEqual([15]);
    f.run(direct);
    expect(f.engine.variables[out].value).toEqual([4]);
    f.engine.input(direct, String(out)).value![0] = 11;
    f.run(direct);
    expect(f.engine.variables[out].value).toEqual([11]);
  } finally {
    f.engine.dispose();
  }
});
