import { jest } from '@jest/globals';
import {
    interactivityNodeSpecs,
    propagateGraphGroupTypes,
    propagateNodeGroupTypes,
    resolveTypeGroupType,
    resolveOutputSocketType,
} from "../src/authoring/spec/nodes";
import { AuthoredNode, AuthoredValue } from "../src/authoring/spec/AuthoredGraph";

// standard type indices (see standardTypes in nodes.ts): 1 = int, 2 = float, 3 = float2
const INT = 1;
const FLOAT = 2;
const FLOAT2 = 3;

const subSpec = interactivityNodeSpecs.find(n => n.op === "math/sub")!;
const subTypeOptions = subSpec.values!.input!.a.typeOptions;

// Build a math/sub node instance the way loadGraphFromJson does: unspecified grouped sockets keep the
// spec default (type int), a static value socket carries {value,type,typeOptions}, and a wired socket
// is a bare {node, socket} link that has dropped its type.
const makeSub = (
    uid: string,
    a: AuthoredValue,
    b: AuthoredValue,
): AuthoredNode => ({
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

// a grouped socket the file omitted — kept at the spec default (int), no static value
const placeholder = (): AuthoredValue =>
    ({ type: INT, value: [undefined], typeOptions: subTypeOptions, typeGroup: "T" });

const wiredTo = (node: string, socket = "value"): AuthoredValue => ({ node, socket });

describe("typeGroup resolution on load (propagateGraphGroupTypes)", () => {
    it("resolves a group from a static float value even when a sibling is an omitted int placeholder", () => {
        const node = makeSub("n1", staticValue(FLOAT, 1.5), placeholder());
        propagateGraphGroupTypes([node]);
        expect(node.values!.output!.value.type).toBe(FLOAT);
        // the omitted placeholder input adopts the resolved type too, so its badge won't read int
        expect(node.values!.input!.b.type).toBe(FLOAT);
    });

    it("lets a wired float source outrank an unconnected int placeholder sibling (the 1b bug)", () => {
        const src = makeSub("src", staticValue(FLOAT, 2), staticValue(FLOAT, 3)); // outputs float
        const poison = makeSub("poison", wiredTo("src"), placeholder());          // a wired, b omitted-int
        propagateGraphGroupTypes([src, poison]);
        expect(src.values!.output!.value.type).toBe(FLOAT);
        expect(poison.values!.output!.value.type).toBe(FLOAT);
        expect(poison.values!.input!.b.type).toBe(FLOAT);
    });

    it("propagates a float type end-to-end down a wired math chain", () => {
        const a = makeSub("a", staticValue(FLOAT, 1), staticValue(FLOAT, 2));
        const b = makeSub("b", wiredTo("a"), wiredTo("a"));
        const c = makeSub("c", wiredTo("b"), wiredTo("b"));
        // intentionally out of topological order to prove the fixpoint iteration handles ordering
        propagateGraphGroupTypes([c, b, a]);
        expect(a.values!.output!.value.type).toBe(FLOAT);
        expect(b.values!.output!.value.type).toBe(FLOAT);
        expect(c.values!.output!.value.type).toBe(FLOAT);
        // the wire leaving each node (colored via resolveOutputSocketType) matches the resolved type
        expect(resolveOutputSocketType(c, "value", [a, b, c])).toBe(FLOAT);
    });

    it("does not mask a genuine mixed-source conflict (int wire vs float wire)", () => {
        const intSrc = makeSub("iSrc", staticValue(INT, 1), staticValue(INT, 2));   // outputs int
        const floatSrc = makeSub("fSrc", staticValue(FLOAT, 1), staticValue(FLOAT, 2)); // outputs float
        const mixed = makeSub("mixed", wiredTo("iSrc"), wiredTo("fSrc"));
        propagateGraphGroupTypes([intSrc, floatSrc, mixed]);
        // the two wired sources genuinely disagree; resolution must not silently unify them —
        // each wired input still points at its own (differently-typed) source for the conflict check
        const aSource = mixed.values!.input!.a.node;
        const bSource = mixed.values!.input!.b.node;
        expect(intSrc.values!.output!.value.type).toBe(INT);
        expect(floatSrc.values!.output!.value.type).toBe(FLOAT);
        expect(aSource).toBe("iSrc");
        expect(bSource).toBe("fSrc");
    });

    it("resolves a wired consumer's badge to the source group type even when the source's stored output type is a stale int", () => {
        // Mirrors the display-path bug: a source math node whose group resolves to float via a static
        // float sibling, but whose stored output `.type` is left at the spec-default int (as if the
        // load propagation hadn't persisted it). A consumer reading the raw stored type would badge
        // int + raise a false type-group conflict; going through resolveOutputSocketType (what both
        // the wire color and now getOwnSocketType/resolveSocketType use) must yield float.
        const src = makeSub("src", staticValue(FLOAT, 1.5), placeholder());
        src.values!.output!.value.type = INT; // stale stored output type, group actually resolves float
        expect(resolveOutputSocketType(src, "value", [src])).toBe(FLOAT);
    });

    it("preserves live-editor precedence: an unconnected dropdown-picked type beats a wire (preferConnections=false)", () => {
        const intSrc = makeSub("iSrc", staticValue(INT, 1), staticValue(INT, 2)); // outputs int
        // a = a bare dropdown pick (float type, no static value), b = wired to the int source
        const node = makeSub("live", { type: FLOAT, value: [undefined], typeOptions: subTypeOptions, typeGroup: "T" }, wiredTo("iSrc"));
        propagateGraphGroupTypes([intSrc]); // resolve the source's output first
        // live mode (dropdown wins)
        expect(resolveTypeGroupType(node, subSpec, "T", [intSrc, node], false)).toBe(FLOAT);
        // load mode (a bare unconnected type is only a placeholder, so the wire wins)
        expect(resolveTypeGroupType(node, subSpec, "T", [intSrc, node], true)).toBe(INT);
    });
});

// The connect/disconnect path in AuthoringComponent now delegates its writeback to the same
// propagateNodeGroupTypes used at load, restricted to the touched group and run with live-editor
// precedence (preferConnections=false). These lock that shared single-group form.
describe("typeGroup writeback on connect (propagateNodeGroupTypes, single group)", () => {
    it("writes a static sibling's type onto the grouped output and the unwired placeholder input", () => {
        // a carries a static float, b is an omitted-int placeholder, output stored at spec-default int
        const node = makeSub("n", staticValue(FLOAT, 1.5), placeholder());
        const changed = propagateNodeGroupTypes(node, [node], false, "T");
        expect(changed).toBe(true);
        expect(node.values!.output!.value.type).toBe(FLOAT);
        expect(node.values!.input!.b.type).toBe(FLOAT);
        // the rewritten follower's value is normalized to the "unset" placeholder
        expect(node.values!.input!.b.value).toEqual([undefined]);
    });

    it("gives an unconnected dropdown pick precedence over a wire and never overwrites a wired input", () => {
        const intSrc = makeSub("iSrc", staticValue(INT, 1), staticValue(INT, 2)); // outputs int
        // a = bare float dropdown pick (no value), b = wired to the int source
        const node = makeSub("live", { type: FLOAT, value: [undefined], typeOptions: subTypeOptions, typeGroup: "T" }, wiredTo("iSrc"));
        propagateGraphGroupTypes([intSrc]);
        propagateNodeGroupTypes(node, [intSrc, node], false, "T");
        // dropdown float wins over the int wire; the output adopts it
        expect(node.values!.output!.value.type).toBe(FLOAT);
        // the wired input keeps its link and is not given a stored type
        expect(node.values!.input!.b.node).toBe("iSrc");
        expect(node.values!.input!.b.type).toBeUndefined();
    });

    it("preserves a sibling's user-entered static value while retyping the group", () => {
        const node = makeSub("n", staticValue(FLOAT, 2.5), staticValue(FLOAT, 7));
        propagateNodeGroupTypes(node, [node], false, "T");
        expect(node.values!.input!.b.value).toEqual([7]); // static value untouched
        expect(node.values!.output!.value.type).toBe(FLOAT);
    });

    it("restricting to an absent group is a no-op", () => {
        const node = makeSub("n", staticValue(FLOAT, 1.5), placeholder());
        const changed = propagateNodeGroupTypes(node, [node], false, "NOPE");
        expect(changed).toBe(false);
        expect(node.values!.output!.value.type).toBe(INT); // unchanged spec default
    });

    it("reports no change when the group already resolves to the stored type", () => {
        const node = makeSub("n", staticValue(INT, 1), placeholder()); // resolves int, output already int
        expect(propagateNodeGroupTypes(node, [node], false, "T")).toBe(false);
    });
});
