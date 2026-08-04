import { reconcileNodeSockets } from "../src/authoring/socketReconciler";
import { interactivityNodeSpecs, propagateGraphGroupTypes } from "../src/authoring/spec/nodes";
import { AuthoredNode, AuthoredValue } from "../src/authoring/spec/AuthoredGraph";

// standard type indices (see standardTypes in nodes.ts)
const INT = 1;
const FLOAT = 2;

const subSpec = interactivityNodeSpecs.find(n => n.op === "math/sub")!;
const subTypeOptions = subSpec.values!.input!.a.typeOptions;

const makeSub = (uid: string, a: AuthoredValue, b: AuthoredValue): AuthoredNode => ({
    uid,
    op: "math/sub",
    declaration: -1,
    values: {
        input: { a, b },
        output: { value: { type: INT, value: [undefined], typeOptions: subTypeOptions, typeGroup: "T" } },
    },
});

const staticValue = (type: number, value: any): AuthoredValue =>
    ({ value: [value], type, typeOptions: subTypeOptions, typeGroup: "T" });

const placeholder = (): AuthoredValue =>
    ({ type: INT, value: [undefined], typeOptions: subTypeOptions, typeGroup: "T" });

const wiredTo = (node: string, socket = "value"): AuthoredValue => ({ node, socket });

// apply the reconciler to a node in place, exactly the way loadGraphFromJson's "Building nodes"
// phase and AuthoringGraphNode's mount reconcile do
const reconcile = (node: AuthoredNode) => {
    const isNoOp = interactivityNodeSpecs.find(s => s.op === node.op) === undefined;
    const reconciled = reconcileNodeSockets({
        op: node.op,
        isNoOp,
        configuration: node.configuration ?? {},
        inputValues: node.values?.input ?? {},
        outputValues: node.values?.output ?? {},
        inputFlows: node.flows?.input ?? {},
        outputFlows: node.flows?.output ?? {},
        events: {},
        variables: [],
    });
    node.values = { input: reconciled.inputValues, output: reconciled.outputValues };
    node.flows = { input: reconciled.inputFlows, output: reconciled.outputFlows };
};

describe("reconcile → propagate → reconcile idempotence (mount order must not matter)", () => {
    it("a re-reconcile after type propagation leaves the whole model unchanged", () => {
        // load-shaped chain: src resolves float via a static value; mid/end adopt it via wires
        const src = makeSub("src", staticValue(FLOAT, 1.5), placeholder());
        const mid = makeSub("mid", wiredTo("src"), placeholder());
        const end = makeSub("end", wiredTo("mid"), placeholder());
        const nodes = [src, mid, end];

        // "Building nodes" (load) → deferred "Resolving types" (canvas rebuild)
        nodes.forEach(reconcile);
        propagateGraphGroupTypes(nodes, true);
        expect(src.values!.output!.value.type).toBe(FLOAT);
        expect(end.values!.input!.b.type).toBe(FLOAT);

        // a node scrolling into view re-runs the reconcile — the model must not move
        const snapshot = structuredClone(nodes);
        nodes.forEach(reconcile);
        expect(nodes).toEqual(snapshot);
    });

    it("keeps a math/switch case socket's resolved/user-picked type across a re-reconcile (the clobber regression)", () => {
        const node: AuthoredNode = {
            uid: "sw",
            op: "math/switch",
            declaration: -1,
            configuration: { cases: { value: [1, 2] } },
            values: { input: {}, output: {} },
        };
        reconcile(node);
        // generated case sockets start at the generator's placeholder type
        expect(node.values!.input!["1"].type).toBe(0);
        // group resolves / user picks float on a case socket
        node.values!.input!["1"] = { ...node.values!.input!["1"], type: FLOAT };
        node.values!.input!["2"] = { ...node.values!.input!["2"], type: FLOAT };
        reconcile(node);
        expect(node.values!.input!["1"].type).toBe(FLOAT);
        expect(node.values!.input!["2"].type).toBe(FLOAT);
    });

    it("preserves a NoOp's declaration-seeded sockets instead of wiping them (mount used to clear them)", () => {
        const noOp: AuthoredNode = {
            uid: "x",
            op: "VENDOR/unknownOp",
            declaration: -1,
            values: {
                input: {
                    withData: { value: [42], type: INT },
                    empty: { value: [undefined], type: FLOAT },
                },
                output: { out: { value: [undefined], type: FLOAT } },
            },
        };
        reconcile(noOp);
        expect(noOp.values!.input!.withData.value).toEqual([42]);
        expect(noOp.values!.input!.empty.type).toBe(FLOAT);
        expect(noOp.values!.output!.out.type).toBe(FLOAT);

        // and a second pass stays stable
        const snapshot = structuredClone(noOp);
        reconcile(noOp);
        expect(noOp).toEqual(snapshot);
    });

    it("never writes the shared registry spec objects into the model (propagation must not corrupt the registry)", () => {
        const node = makeSub("n", staticValue(FLOAT, 1.5), placeholder());
        reconcile(node);
        expect(node.values!.input!.b).not.toBe(subSpec.values!.input!.b);
        expect(node.values!.output!.value).not.toBe(subSpec.values!.output!.value);
        const specBefore = structuredClone(subSpec);
        propagateGraphGroupTypes([node], true);
        expect(node.values!.output!.value.type).toBe(FLOAT); // propagation did run
        expect(subSpec).toEqual(specBefore);                  // ...without touching the registry
    });
});
