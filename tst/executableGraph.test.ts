import { getExecutableDeclarationIndex, isUnsetConfigurationValue, toExecutableFlows, toExecutableValue } from "../src/authoring/executableGraph";

describe("executable graph compilation", () => {
    it("exports an untouched type-default input as type only", () => {
        expect(toExecutableValue({ value: [undefined], type: 2, typeOptions: [2], typeDefault: true })).toEqual({ type: 2 });
    });

    it("exports unset editor placeholders as type-defaults instead of invalid literals", () => {
        expect(toExecutableValue({ value: [NaN], type: 2 })).toEqual({ type: 2 });
        expect(toExecutableValue({ value: [null], type: 1 })).toEqual({ type: 1 });
        expect(toExecutableValue({ value: [1, undefined, 3], type: 4 })).toEqual({ type: 4 });
        expect(toExecutableValue({ value: [0], type: 1 })).toEqual({ value: [0], type: 1 });
        expect(toExecutableValue({ node: 3, socket: "value" })).toEqual({ node: 3, socket: "value" });
    });

    it("omits unset configuration values and unconnected output flows", () => {
        expect(isUnsetConfigurationValue({ value: [null] })).toBe(true);
        expect(isUnsetConfigurationValue({})).toBe(true);
        expect(isUnsetConfigurationValue({ value: [] })).toBe(false);
        expect(isUnsetConfigurationValue({ value: [false] })).toBe(false);
        expect(toExecutableFlows({ out: { node: undefined, socket: undefined }, err: { node: 2, socket: "in" } }))
            .toEqual({ err: { node: 2, socket: "in" } });
    });

    it("preserves declaration indices when a loaded graph has multiple declarations for the same op", () => {
        const declarations = [
            {
                op: "pointer/get",
                outputValueSockets: {
                    value: { type: 2 },
                },
            },
            {
                op: "pointer/get",
                outputValueSockets: {
                    value: { type: 5 },
                },
            },
        ];

        expect(getExecutableDeclarationIndex({
            declaration: 1,
            op: "pointer/get",
        }, declarations)).toBe(1);
    });

    it("falls back to the op declaration for newly authored nodes without a graph-local declaration", () => {
        const declarations = [
            { op: "event/onStart" },
            { op: "variable/set" },
        ];

        expect(getExecutableDeclarationIndex({
            declaration: -1,
            op: "variable/set",
        }, declarations)).toBe(1);
    });
});
