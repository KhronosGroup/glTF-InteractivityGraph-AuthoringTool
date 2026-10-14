import type { BasicBehaveEngine } from "./BasicBehaveEngine";
import type { BehaveEngineNode } from "./BehaveEngineNode";
import type {
  IInteractivityValue,
  IInteractivityValueType,
} from "./types/InteractivityGraph";

type CompiledValue = number | boolean | number[];
export interface CompiledOutput {
  type: number;
  value: CompiledValue;
  version: number;
  evaluate: () => CompiledValue;
}

/** Pre-resolve standard data edges into cached closures, without generated source. */
export function compileValueOutputs(
  engine: BasicBehaveEngine,
  nodes: ReadonlyMap<number, BehaveEngineNode>,
  standard: ReadonlyMap<string, typeof BehaveEngineNode>,
  types: IInteractivityValueType[],
): Array<Record<string, CompiledOutput>> {
  const outputs: Array<Record<string, CompiledOutput>> = [];
  const signatures: string[] = types.map((t) => t.signature),
    index = (name: string) => signatures.indexOf(name);
  const supported = (type: number) =>
    /^(bool|int|float(?:[234](?:x[234])?)?)$/.test(signatures[type] ?? "");
  const scalar = (v: unknown, type: number): CompiledValue =>
    signatures[type] === "bool" ? v === true || v === "true" : Number(v);
  const parse = (v: unknown[] | undefined, type: number): CompiledValue =>
    ["int", "float", "bool"].includes(signatures[type])
      ? scalar(
          v?.[0] ??
            (signatures[type] === "float"
              ? NaN
              : signatures[type] === "bool"
                ? false
                : 0),
          type,
        )
      : ((v as number[] | undefined) ??
        Array(
          Number(
            signatures[type]
              .slice(5)
              .split("x")
              .reduce((n, v) => n * Number(v), 1),
          ),
        ).fill(NaN));
  const read = (cell: CompiledOutput): CompiledValue => {
    if (
      cell.version !== Infinity &&
      cell.version !== engine.valueEvaluationEpoch
    ) {
      cell.value = cell.evaluate();
      cell.version = engine.valueEvaluationEpoch;
    }
    return cell.value;
  };
  const input = (
    value: IInteractivityValue | undefined,
  ): CompiledOutput | undefined => {
    if (!value) return undefined;
    if (value.node !== undefined)
      return outputs[Number(value.node)]?.[value.socket ?? "value"];
    const type = value.type;
    if (type === undefined || !supported(type)) return undefined;
    // Keep main's live-literal semantics when an editor changes value[0] or replaces the array.
    return {
      type,
      get value() { return parse(value.value, type); },
      version: Infinity,
      evaluate: () => parse(value.value, type),
    };
  };
  for (const [id, node] of nodes) {
    outputs[id] = {};
    const op = node.declaration.op;
    if (node.declaration.extension || node.constructor !== standard.get(op))
      continue;
    let type = -1,
      evaluate: (() => CompiledValue) | undefined;
    const a = input(node.values.a),
      b = input(node.values.b),
      kind = a ? signatures[a.type] : undefined;
    const numeric = a && ["float", "int"].includes(kind!),
      matching = a && b && a.type === b.type;
    const av = a?.version === Infinity ? () => a.value : () => read(a!),
      bv = b?.version === Infinity ? () => b.value : () => read(b!);
    if (op === "variable/get") {
      const variable =
        engine.variables[node.configuration.variable?.value?.[0]];
      if (!variable) continue;
      type = variable.type;
      if (!supported(type)) continue;
      evaluate =
        signatures[type] === "bool"
          ? () => scalar(variable.value?.[0], type)
          : ["int", "float"].includes(signatures[type])
            ? () => Number(variable.value?.[0])
            : () => variable.value!;
    } else if (op === "pointer/get") {
      type = node.configuration.type?.value?.[0];
      if (!supported(type)) continue;
      evaluate = () => {
        const result = node.processNode()?.value;
        if (!result) throw new Error("Missing pointer output");
        return parse(result.value, type);
      };
    } else if (
      /^math\/extract[234](?:x[234])?$/.test(op) &&
      a &&
      kind === "float" + op.slice(12)
    ) {
      const count = Number(
        op
          .slice(12)
          .split("x")
          .reduce((n, v) => n * Number(v), 1),
      );
      for (let j = 0; j < count; j++)
        outputs[id][String(j)] = {
          type: index("float"),
          value: 0,
          version: -1,
          evaluate: () => {
            engine.processNodeStarted(node);
            return (av() as number[])[j];
          },
        };
      continue;
    } else if (/^math\/combine[234](?:x[234])?$/.test(op)) {
      const shape = op.slice(12),
        count = Number(shape.split("x").reduce((n, v) => n * Number(v), 1));
      const parts = Array.from({ length: count }, (_, j) =>
        input(node.values[String.fromCharCode(97 + j)]),
      );
      if (parts.some((v) => !v || signatures[v.type] !== "float")) continue;
      type = index("float" + shape);
      evaluate = () => parts.map((v) => Number(read(v!)));
    } else if (op === "math/select") {
      const condition = input(node.values.condition);
      if (!matching || signatures[condition?.type ?? -1] !== "bool") continue;
      type = a!.type;
      evaluate = () => (read(condition!) ? av() : bv());
    } else if (op === "math/switch") {
      const fallback = input(node.values.default),
        selection = input(node.values.selection),
        cases = node.configuration.cases?.value ?? [];
      if (
        !fallback ||
        signatures[selection?.type ?? -1] !== "int" ||
        !cases.every((n: unknown) => typeof n === "number" && n === (n | 0))
      )
        continue;
      const options = new Map<number, CompiledOutput>();
      let valid = true;
      for (const n of cases) {
        const choice = input(node.values[String(n)]);
        if (!choice || choice.type !== fallback.type) {
          valid = false;
          break;
        }
        options.set(n, choice);
      }
      if (!valid) continue;
      type = fallback.type;
      evaluate = () => read(options.get(Number(read(selection!))) ?? fallback);
    } else if (op.startsWith("type/") && a) {
      const conversions: Record<
        string,
        [string, string, (v: CompiledValue) => CompiledValue]
      > = {
        "type/floatToInt": ["float", "int", (v) => Number(v) | 0],
        "type/intToFloat": ["int", "float", Number],
        "type/boolToFloat": ["bool", "float", Number],
        "type/boolToInt": ["bool", "int", Number],
        "type/floatToBool": ["float", "bool", Boolean],
        "type/intToBool": ["int", "bool", Boolean],
      };
      const conversion = conversions[op];
      if (!conversion || kind !== conversion[0]) continue;
      type = index(conversion[1]);
      evaluate = () => conversion[2](av());
    } else if (op === "math/not" && a && ["int", "bool"].includes(kind!)) {
      type = a.type;
      evaluate = kind === "bool" ? () => !av() : () => ~Number(av());
    } else if (
      matching &&
      ["math/eq", "math/lt", "math/le", "math/gt", "math/ge"].includes(op)
    ) {
      if (
        !["float", "int", "bool"].includes(kind!) ||
        (op !== "math/eq" && !numeric)
      )
        continue;
      type = index("bool");
      switch (op) {
        case "math/eq":
          evaluate = () => av() === bv();
          break;
        case "math/lt":
          evaluate = () => Number(av()) < Number(bv());
          break;
        case "math/le":
          evaluate = () => Number(av()) <= Number(bv());
          break;
        case "math/gt":
          evaluate = () => Number(av()) > Number(bv());
          break;
        case "math/ge":
          evaluate = () => Number(av()) >= Number(bv());
      }
    } else if (
      matching &&
      ["math/and", "math/or", "math/xor", "math/lsl", "math/asr"].includes(
        op,
      ) &&
      ["bool", "int"].includes(kind!)
    ) {
      type = a!.type;
      if (kind === "bool") {
        if (op === "math/and")
          evaluate = () => {
            const x = av(),
              y = bv();
            return Boolean(x && y);
          };
        else if (op === "math/or")
          evaluate = () => {
            const x = av(),
              y = bv();
            return Boolean(x || y);
          };
        else if (op === "math/xor") evaluate = () => av() !== bv();
      } else
        switch (op) {
          case "math/and":
            evaluate = () => Number(av()) & Number(bv());
            break;
          case "math/or":
            evaluate = () => Number(av()) | Number(bv());
            break;
          case "math/xor":
            evaluate = () => Number(av()) ^ Number(bv());
            break;
          case "math/lsl":
            evaluate = () => Number(av()) << Number(bv());
            break;
          case "math/asr":
            evaluate = () => Number(av()) >> Number(bv());
            break;
        }
    } else if (matching && numeric) {
      type = a!.type;
      const wrap = (v: number) => (kind === "int" ? v | 0 : v);
      switch (op) {
        case "math/add":
          evaluate = () => wrap(Number(av()) + Number(bv()));
          break;
        case "math/sub":
          evaluate = () => wrap(Number(av()) - Number(bv()));
          break;
        case "math/mul":
          evaluate =
            kind === "int"
              ? () => Math.imul(Number(av()), Number(bv()))
              : () => Number(av()) * Number(bv());
          break;
        case "math/div":
          evaluate = () => wrap(Number(av()) / Number(bv()));
          break;
        case "math/rem":
          evaluate = () => wrap(Number(av()) % Number(bv()));
          break;
      }
    } else if (a && kind === "float") {
      type = a.type;
      if (op === "math/floor") evaluate = () => Math.floor(Number(av()));
      else if (op === "math/trunc") evaluate = () => Math.trunc(Number(av()));
    }
    if (evaluate && type >= 0) {
      const calculate = evaluate;
      outputs[id].value = {
        type,
        value: 0,
        version: -1,
        evaluate: () => {
          if (op !== "pointer/get") engine.processNodeStarted(node);
          return calculate();
        },
      };
    }
  }
  return outputs;
}

/** Pre-bind common synchronous control nodes; custom/opaque inputs retain the interpreter. */
export function compileControlNodes(
  engine: BasicBehaveEngine,
  nodes: ReadonlyMap<number, BehaveEngineNode>,
  standard: ReadonlyMap<string, typeof BehaveEngineNode>,
  outputs: Array<Record<string, CompiledOutput>>,
  types: IInteractivityValueType[],
): void {
  const reader = (
    v: IInteractivityValue | undefined,
  ): (() => CompiledValue) | undefined => {
    if (!v) return undefined;
    if (v.node !== undefined) {
      const cell = outputs[Number(v.node)]?.[v.socket ?? "value"];
      if (!cell) return undefined;
      return () => {
        if (
          cell.version !== Infinity &&
          cell.version !== engine.valueEvaluationEpoch
        ) {
          cell.value = cell.evaluate();
          cell.version = engine.valueEvaluationEpoch;
        }
        return cell.value;
      };
    }
    const name = types[v.type!]?.signature;
    if (!name || !/^(bool|int|float(?:[234](?:x[234])?)?)$/.test(name))
      return undefined;
    const value =
      v.value ??
      (name === "bool"
        ? [false]
        : name === "int"
          ? [0]
          : Array(
              name === "float"
                ? 1
                : Number(
                    name
                      .slice(5)
                      .split("x")
                      .reduce((n, v) => n * Number(v), 1),
                  ),
            ).fill(NaN));
    return () => {
      const current=v.value??value;
      return ["int","float"].includes(name)?Number(current[0]):name==="bool"?current[0]===true||current[0]==="true":current;
    };
  };
  for (const node of nodes.values()) {
    const op = node.declaration.op;
    if (node.declaration.extension || node.constructor !== standard.get(op))
      continue;
    const flow = (socket: string) => {
      const edge = node.flows[socket],
        target = edge ? nodes.get(Number(edge.node)) : undefined;
      if (!edge || !target || !target.INPUT_FLOWS.includes(edge.socket ?? "in"))
        return () => {/*no-op*/};
      return () => {
        engine.processExecutingNextNode(edge);
        target.processNode(edge.socket);
      };
    };
    if (op === "variable/set") {
      const ids = node.configuration.variables.value!.map(Number),
        getters = ids.map((id: number) => reader(node.values[String(id)]));
      if (getters.some((v: (() => CompiledValue) | undefined) => !v)) continue;
      const variables = ids.map((id: number) => engine.variables[id]),
        values: CompiledValue[] = [],
        next = flow("out");
      node.processNode = () => {
        engine.clearValueEvaluationCache();
        for (let j = 0; j < getters.length; j++) values[j] = getters[j]!();
        engine.processNodeStarted(node);
        for (let j = 0; j < ids.length; j++) {
          engine.clearVariableInterpolation(ids[j]);
          const v = values[j];
          variables[j].value = Array.isArray(v) ? v : [v];
        }
        next();
      };
    } else if (op === "flow/branch") {
      const condition = reader(node.values.condition);
      if (!condition) continue;
      const yes = flow("true"),
        no = flow("false");
      node.processNode = () => {
        engine.clearValueEvaluationCache();
        const c = condition();
        engine.processNodeStarted(node);
        if (c) yes();
        else no();
      };
    } else if (op === "flow/sequence") {
      const flows = Object.keys(node.flows).sort().map(flow);
      node.processNode = () => {
        engine.clearValueEvaluationCache();
        engine.processNodeStarted(node);
        for (const activate of flows) activate();
      };
    }
  }
  // Recover constant decision tables from balanced standard branch trees.
  // Debug/custom execution hooks use the original per-node path.
  for (const root of nodes.values()) {
    if (
      root.declaration.op !== "flow/branch" ||
      root.constructor !== standard.get("flow/branch")
    )
      continue;
    const first = root.values.condition,
      comparison =
        first?.node === undefined ? undefined : nodes.get(Number(first.node));
    if (
      !comparison ||
      !["math/lt", "math/eq"].includes(comparison.declaration.op)
    )
      continue;
    const selection = comparison.values.a,
      getSelection = reader(selection);
    if (!getSelection || selection?.node === undefined) continue;
    const equal = (v: IInteractivityValue | undefined) =>
      v?.node === selection.node &&
      (v?.socket ?? "value") === (selection.socket ?? "value");
    type Decision = {
      op: string;
      limit: number;
      yes: Decision | (() => void);
      no: Decision | (() => void);
    };
    let size = 0;
    const active = new Set<number>();
    const build = (n: BehaveEngineNode): Decision | undefined => {
      if (
        active.has(n.index) ||
        n.declaration.extension ||
        n.constructor !== standard.get("flow/branch")
      )
        return undefined;
      const source = n.values.condition?.node,
        c = source === undefined ? undefined : nodes.get(Number(source));
      if (
        !c ||
        !outputs[c.index]?.value ||
        c.declaration.extension ||
        c.constructor !== standard.get(c.declaration.op) ||
        !["math/lt", "math/eq"].includes(c.declaration.op) ||
        !equal(c.values.a) ||
        c.values.b?.type === undefined ||
        types[c.values.b.type]?.signature !== "int" ||
        c.values.b.node !== undefined ||
        c.values.b.value?.length !== 1
      )
        return undefined;
      active.add(n.index);
      size++;
      const edge = (socket: string) => {
        const f = n.flows[socket],
          target = f ? nodes.get(Number(f.node)) : undefined;
        if (!f || !target || !target.INPUT_FLOWS.includes(f.socket ?? "in"))
          return () => {/*no-op*/};
        return (
          build(target) ??
          (() => {
            engine.processExecutingNextNode(f);
            target.processNode(f.socket);
          })
        );
      };
      const result = {
        op: c.declaration.op,
        get limit() { return Number(c.values.b.value?.[0]); },
        yes: edge("true"),
        no: edge("false"),
      };
      active.delete(n.index);
      return result;
    };
    const tree = build(root);
    if (!tree || size < 3) continue;
    const fallback = root.processNode.bind(root);
    root.processNode = (socket?: string) => {
      if (engine.hasExecutionHooks()) {
        fallback(socket);
        return;
      }
      engine.clearValueEvaluationCache();
      const selected = Number(getSelection());
      let current: Decision | (() => void) = tree;
      while (typeof current !== "function")
        current = (
          current.op === "math/lt"
            ? selected < current.limit
            : selected === current.limit
        )
          ? current.yes
          : current.no;
      current();
    };
  }
}
