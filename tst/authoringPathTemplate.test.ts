import { getMessageTemplateSocketIds, getPathTemplateSockets, parsePathTemplate } from "../src/authoring/pathTemplate";
import { standardTypes } from "../src/BasicBehaveEngine/types/nodes";

describe("authoring path templates", () => {
    it("extracts bracket parameters as pointer index sockets", () => {
        expect(getPathTemplateSockets("/nodes/[nodeIndex]/translation")).toEqual([
            {id: "nodeIndex", kind: "index"},
        ]);
    });

    it("extracts brace parameters as pointer reference sockets", () => {
        expect(getPathTemplateSockets("/nodes/{nodeRef}/translation")).toEqual([
            {id: "nodeRef", kind: "ref"},
        ]);
    });

    it("decodes JSON pointer tokens in pointer parameter socket ids", () => {
        expect(getPathTemplateSockets("/nodes/[my~1index]/scale")).toEqual([
            {id: "my/index", kind: "index"},
        ]);
    });

    it("does not treat doubled literal brackets as pointer parameters", () => {
        expect(getPathTemplateSockets("/nodes/[index]/extras/{{index}}")).toEqual([
            {id: "index", kind: "index"},
        ]);
    });

    it("marks duplicate pointer parameter socket ids as invalid", () => {
        expect(parsePathTemplate("/nodes/{node}/weights/[node]")).toEqual({
            valid: false,
            sockets: [],
        });
    });

    it("extracts debug message sockets independently from pointer syntax", () => {
        expect(getMessageTemplateSocketIds("position {value} on {{node}}")).toEqual(["value"]);
    });

    it("keeps ref available as a standard authoring type", () => {
        expect(standardTypes.some((type) => type.signature === "ref")).toBe(true);
    });
});
