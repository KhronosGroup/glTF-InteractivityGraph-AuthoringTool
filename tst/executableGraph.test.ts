import { getExecutableDeclarationIndex } from "../src/authoring/executableGraph";

describe("executable graph compilation", () => {
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
