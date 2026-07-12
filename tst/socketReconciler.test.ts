import { computeConfigDrivenSockets, mergeFlowSockets, mergeValueSockets } from "../src/authoring/socketReconciler";
import { AuthoredValue } from "../src/authoring/spec/AuthoredGraph";
import { IInteractivityFlow, IInteractivityVariable } from "../src/BasicBehaveEngine/types/InteractivityGraph";

describe("computeConfigDrivenSockets", () => {
    it("does not abort the whole node when event.value references a stale/deleted custom event id (the early-return bug)", () => {
        const result = computeConfigDrivenSockets(
            { event: { value: [0] }, pointer: { value: ["/nodes/[index]"] } },
            {},
            { nodeType: "event/send", events: {}, variables: [] }
        );
        // the pointer config key must still be processed even though the event id is stale
        expect(result.inputValues["index"]).toBeDefined();
    });

    it("skips a stale variable id instead of throwing", () => {
        expect(() =>
            computeConfigDrivenSockets(
                { variable: { value: [42] } },
                {},
                { nodeType: "variable/get", events: {}, variables: [] as IInteractivityVariable[] }
            )
        ).not.toThrow();
    });

    it("skips a stale id inside a multi-variable list instead of throwing", () => {
        const result = computeConfigDrivenSockets(
            { variables: { value: [0, 42] } },
            {},
            { nodeType: "variable/set", events: {}, variables: [{ type: 2, value: [1] }] as IInteractivityVariable[] }
        );
        expect(result.inputValues[0]).toBeDefined();
        expect(result.inputValues[42]).toBeUndefined();
    });

    it("generates one input flow per configured inputFlows count", () => {
        const result = computeConfigDrivenSockets({ inputFlows: { value: [3] } }, {}, { nodeType: "flow/waitAll", events: {}, variables: [] });
        expect(Object.keys(result.inputFlows)).toEqual(["0", "1", "2"]);
    });

    it("keeps an existing event input value instead of resetting it", () => {
        const events = { 0: { values: { message: { type: 9 } } } } as any;
        const existing: Record<string, AuthoredValue> = { message: { value: ["hi"], type: 9, typeOptions: [9] } };
        const result = computeConfigDrivenSockets({ event: { value: [0] } }, existing, { nodeType: "event/send", events, variables: [] });
        expect(result.inputValues.message).toBe(existing.message);
    });
});

describe("mergeValueSockets", () => {
    const specDefaults: Record<string, AuthoredValue> = {
        a: { value: [undefined], type: 1, typeOptions: [1, 2], typeGroup: "T" },
    };

    it("is additive: a spec socket with no existing data and no generated entry falls back to the spec default", () => {
        const result = mergeValueSockets({ existing: {}, generated: {}, specDefaults, extraKeys: [], allowExistingToOverrideGenerated: true });
        expect(result.a).toEqual(specDefaults.a);
    });

    it("never aliases the spec-default object into the result (in-place type propagation must not corrupt the shared registry)", () => {
        const result = mergeValueSockets({ existing: {}, generated: {}, specDefaults, extraKeys: [], allowExistingToOverrideGenerated: true });
        expect(result.a).not.toBe(specDefaults.a);
        expect(result.a.value).not.toBe(specDefaults.a.value);
        // the same graph loaded twice must not see a registry mutated by the first load
        result.a.type = 2;
        (result.a.value as any[])[0] = 123;
        expect(specDefaults.a.type).toBe(1);
        expect(specDefaults.a.value?.[0]).toBeUndefined();
    });

    it("preserves a grouped socket's resolved type instead of snapping back to the spec default type", () => {
        const existing: Record<string, AuthoredValue> = { a: { value: [undefined], type: 2, typeOptions: [1, 2], typeGroup: "T" } };
        const result = mergeValueSockets({ existing, generated: {}, specDefaults, extraKeys: [], allowExistingToOverrideGenerated: true });
        expect(result.a.type).toBe(2);
    });

    it("never drops a socket with real user data, even if the spec/generated set no longer mentions it", () => {
        const existing: Record<string, AuthoredValue> = { custom: { value: [5], type: 1, typeOptions: [1] } };
        const result = mergeValueSockets({ existing, generated: {}, specDefaults: {}, extraKeys: ["custom"], allowExistingToOverrideGenerated: true });
        expect(result.custom).toBe(existing.custom);
    });

    it("drops an unknown extra socket once it no longer carries data and dynamic sockets aren't allowed", () => {
        const existing: Record<string, AuthoredValue> = { custom: { value: [undefined], type: 1, typeOptions: [1] } };
        const result = mergeValueSockets({ existing, generated: {}, specDefaults: {}, extraKeys: ["custom"], allowExistingToOverrideGenerated: true });
        expect(result.custom).toBeUndefined();
    });

    it("output sockets: a freshly generated entry always wins over existing state (never reverted)", () => {
        const existing: Record<string, AuthoredValue> = { value: { value: [1], type: 1, typeOptions: [1] } };
        const generated: Record<string, AuthoredValue> = { value: { value: [undefined], type: 5, typeOptions: [5] } };
        const result = mergeValueSockets({ existing, generated, specDefaults: {}, extraKeys: [], allowExistingToOverrideGenerated: false });
        expect(result.value).toBe(generated.value);
    });

    it("input sockets: existing real data wins back over a freshly generated placeholder", () => {
        const existing: Record<string, AuthoredValue> = { value: { value: [7], type: 5, typeOptions: [5] } };
        const generated: Record<string, AuthoredValue> = { value: { value: [undefined], type: 5, typeOptions: [5] } };
        const result = mergeValueSockets({ existing, generated, specDefaults: {}, extraKeys: [], allowExistingToOverrideGenerated: true });
        expect(result.value).toBe(existing.value);
    });

    it("a pointer slot whose kind changed keeps the freshly generated socket instead of the stale one", () => {
        const existing: Record<string, AuthoredValue> = { ref: { value: [3], type: 1, typeOptions: [1] } }; // stale int-kind data
        const generated: Record<string, AuthoredValue> = { ref: { value: [undefined], type: 9, typeOptions: [9] } }; // now a ref-kind slot
        const result = mergeValueSockets({
            existing,
            generated,
            specDefaults: {},
            extraKeys: [],
            pointerSlotTypeById: new Map([["ref", 9]]),
            allowExistingToOverrideGenerated: true,
        });
        expect(result.ref).toBe(generated.ref);
    });

    it("a generated grouped socket (math/switch case) keeps its resolved group type instead of the generator's placeholder", () => {
        // existing case socket carries type 2 resolved by propagateGraphGroupTypes; the generator
        // re-stamps type 0 on every reconcile — the resolved type must survive a (re)mount
        const existing: Record<string, AuthoredValue> = { "1": { value: [undefined], type: 2, typeOptions: [1, 2], typeGroup: "T" } };
        const generated: Record<string, AuthoredValue> = { "1": { value: [undefined], type: 0, typeOptions: [1, 2], typeGroup: "T" } };
        const result = mergeValueSockets({ existing, generated, specDefaults: {}, extraKeys: [], allowExistingToOverrideGenerated: true });
        expect(result["1"].type).toBe(2);
        expect(result["1"].typeGroup).toBe("T");
    });

    it("a non-grouped generated socket keeps its authoritative generated type over a stale existing type", () => {
        // e.g. an event param / type-config socket: the generated concrete type must win
        const existing: Record<string, AuthoredValue> = { p: { value: [undefined], type: 2, typeOptions: [2] } };
        const generated: Record<string, AuthoredValue> = { p: { value: [undefined], type: 9, typeOptions: [9] } };
        const result = mergeValueSockets({ existing, generated, specDefaults: {}, extraKeys: [], allowExistingToOverrideGenerated: true });
        expect(result.p).toBe(generated.p);
    });

    it("a generated grouped socket with real user data still wins outright (existing-data branch)", () => {
        const existing: Record<string, AuthoredValue> = { "1": { value: [5], type: 2, typeOptions: [1, 2], typeGroup: "T" } };
        const generated: Record<string, AuthoredValue> = { "1": { value: [undefined], type: 0, typeOptions: [1, 2], typeGroup: "T" } };
        const result = mergeValueSockets({ existing, generated, specDefaults: {}, extraKeys: [], allowExistingToOverrideGenerated: true });
        expect(result["1"]).toBe(existing["1"]);
    });

    it("a preserved pointer slot is left untouched by the generic merge", () => {
        const existing: Record<string, AuthoredValue> = { ref: { value: ["/nodes/3"], type: 9, typeOptions: [9] } };
        const generated: Record<string, AuthoredValue> = { ref: { value: ["/nodes/3"], type: 9, typeOptions: [9] } };
        const result = mergeValueSockets({
            existing,
            generated,
            specDefaults: { ref: { value: [undefined], type: 9, typeOptions: [9], description: "spec desc" } },
            extraKeys: [],
            preservedKeys: new Set(["ref"]),
            allowExistingToOverrideGenerated: true,
        });
        expect(result.ref).toBe(generated.ref);
    });
});

describe("mergeFlowSockets", () => {
    it("a connected existing flow wins over the spec default", () => {
        const existing: Record<string, IInteractivityFlow> = { out: { node: "n1", socket: "in" } };
        const specDefaults: Record<string, IInteractivityFlow> = { out: { node: undefined, socket: undefined } };
        const result = mergeFlowSockets({ existing, generated: {}, specDefaults });
        expect(result.out).toBe(existing.out);
    });

    it("an unconnected generated flow is kept when there is no existing connection", () => {
        const generated: Record<string, IInteractivityFlow> = { "0": { node: undefined, socket: undefined } };
        const result = mergeFlowSockets({ existing: {}, generated, specDefaults: {} });
        expect(result["0"]).toBe(generated["0"]);
    });
});
