import { interactivityNodeSpecs, propagateGraphGroupTypes } from "../src/authoring/spec/nodes";
import { AuthoredNode, AuthoredValue } from "../src/authoring/spec/AuthoredGraph";
import { computeGraphLiveWarnings, computeNodeLiveWarnings } from "../src/authoring/validation";
import { IInteractivityVariable } from "../src/BasicBehaveEngine/types/InteractivityGraph";

// standard type indices (see standardTypes in nodes.ts): 0 = bool, 1 = int, 2 = float
const BOOL = 0;
const INT = 1;
const FLOAT = 2;

const subSpec = interactivityNodeSpecs.find(n => n.op === "math/sub")!;
const subTypeOptions = subSpec.values!.input!.a.typeOptions;

// Build a math/sub node instance the way loadGraphFromJson does (see typeResolution.test.ts)
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

// a source node with a fixed bool `value` output (no type group), for mismatch tests
const makeBoolSource = (uid: string): AuthoredNode => ({
    uid,
    op: "math/eq",
    declaration: -1,
    values: {
        input: {},
        output: { value: { type: BOOL, value: [undefined], typeOptions: [BOOL] } },
    },
});

const noVariables: IInteractivityVariable[] = [];

describe("computeNodeLiveWarnings", () => {
    it("flags an unconnected socket with no value set (missing value)", () => {
        const node = makeSub("n1", staticValue(FLOAT, 1.5), placeholder());
        const warnings = computeNodeLiveWarnings(node, [node], noVariables);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].socket).toBe("b");
        expect(warnings[0].message).toContain('Missing value on socket "b"');
    });

    it("is clean when every socket is wired or carries a static value", () => {
        const src = makeSub("src", staticValue(FLOAT, 1), staticValue(FLOAT, 2));
        const node = makeSub("n1", wiredTo("src"), staticValue(FLOAT, 3));
        expect(computeNodeLiveWarnings(node, [src, node], noVariables)).toHaveLength(0);
    });

    it("flags a wired source whose type the socket does not accept (type mismatch)", () => {
        const boolSrc = makeBoolSource("bSrc");
        const node = makeSub("n1", wiredTo("bSrc"), staticValue(FLOAT, 1));
        const warnings = computeNodeLiveWarnings(node, [boolSrc, node], noVariables);
        expect(warnings.some(w => w.socket === "a" && w.message.includes('Type mismatch on socket "a"'))).toBe(true);
    });

    it("flags siblings of the same type group that disagree (group conflict), on every disagreeing member", () => {
        const intSrc = makeSub("iSrc", staticValue(INT, 1), staticValue(INT, 2)); // outputs int
        // a wired to an int source, b a bare float dropdown pick — both flagged, neither is "correct"
        const node = makeSub("n1", wiredTo("iSrc"), { type: FLOAT, value: [undefined], typeOptions: subTypeOptions, typeGroup: "T" });
        propagateGraphGroupTypes([intSrc]);
        const warnings = computeNodeLiveWarnings(node, [intSrc, node], noVariables);
        expect(warnings.some(w => w.socket === "a" && w.message.includes("Type group mismatch"))).toBe(true);
        expect(warnings.some(w => w.socket === "b" && w.message.includes("Type group mismatch"))).toBe(true);
    });

    it("reports at most one warning per socket, in mismatch > conflict > missing priority", () => {
        const boolSrc = makeBoolSource("bSrc");
        // `a` is both a type mismatch (bool wire) and part of a conflicting group — only the
        // mismatch may be reported for it
        const node = makeSub("n1", wiredTo("bSrc"), staticValue(FLOAT, 1));
        const warnings = computeNodeLiveWarnings(node, [boolSrc, node], noVariables);
        expect(warnings.filter(w => w.socket === "a")).toHaveLength(1);
        expect(warnings.find(w => w.socket === "a")!.message).toContain("Type mismatch");
    });

    it("yields no live warnings for a NoOp (op without a registry spec)", () => {
        const noOp: AuthoredNode = {
            uid: "x1",
            op: "VENDOR/unknownOp",
            declaration: -1,
            values: { input: { foo: { value: [undefined], type: INT } }, output: {} },
        };
        expect(computeNodeLiveWarnings(noOp, [noOp], noVariables)).toHaveLength(0);
    });

    it("labels variable/set sockets with the variable's name", () => {
        const variables = [{ name: "speed", type: FLOAT, value: [0] } as IInteractivityVariable];
        const node: AuthoredNode = {
            uid: "v1",
            op: "variable/set",
            declaration: -1,
            values: { input: { "0": { value: [undefined], type: FLOAT, typeOptions: [FLOAT] } }, output: {} },
        };
        const warnings = computeNodeLiveWarnings(node, [node], variables);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].message).toContain('Missing value on socket "speed"');
    });
});

describe("computeGraphLiveWarnings", () => {
    it("returns whole-graph warnings keyed by uid, omitting clean nodes", () => {
        const clean = makeSub("clean", staticValue(FLOAT, 1), staticValue(FLOAT, 2));
        const dirty = makeSub("dirty", staticValue(FLOAT, 1), placeholder());
        const result = computeGraphLiveWarnings([clean, dirty], noVariables);
        expect(result.has("clean")).toBe(false);
        expect(result.get("dirty")).toHaveLength(1);
    });

    it("is independent of node order (mount/viewport order must never change diagnostics)", () => {
        const src = makeSub("src", staticValue(FLOAT, 1), staticValue(FLOAT, 2));
        const mid = makeSub("mid", wiredTo("src"), placeholder());
        const end = makeSub("end", wiredTo("mid"), placeholder());
        propagateGraphGroupTypes([src, mid, end]);
        const forward = computeGraphLiveWarnings([src, mid, end], noVariables);
        const backward = computeGraphLiveWarnings([end, mid, src], noVariables);
        expect(Object.fromEntries(backward)).toEqual(Object.fromEntries(forward));
    });

    it("handles an empty graph", () => {
        expect(computeGraphLiveWarnings([], noVariables).size).toBe(0);
    });
});
