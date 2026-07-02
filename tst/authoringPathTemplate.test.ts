import { getMessageTemplateSocketIds, getPathTemplateSockets, parsePathTemplate, setPathTemplateSlotKind } from "../src/authoring/pathTemplate";
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

    it("renames the slot id from Index to Ref when switching an index slot to ref", () => {
        expect(setPathTemplateSlotKind("/nodes/[nodeIndex]/translation", "nodeIndex", "ref"))
            .toEqual("/nodes/{nodeRef}/translation");
    });

    it("renames the slot id from Ref to Index when switching a ref slot to index", () => {
        expect(setPathTemplateSlotKind("/nodes/{nodeRef}/translation", "nodeRef", "index"))
            .toEqual("/nodes/[nodeIndex]/translation");
    });

    it("renames a bare index/ref slot id", () => {
        expect(setPathTemplateSlotKind("/nodes/[index]/scale", "index", "ref"))
            .toEqual("/nodes/{ref}/scale");
    });

    it("switches delimiters without renaming ids that lack the Index/Ref marker", () => {
        expect(setPathTemplateSlotKind("/nodes/[node]/translation", "node", "ref"))
            .toEqual("/nodes/{node}/translation");
    });

    it("keeps the original id when a rename would collide with another slot", () => {
        expect(setPathTemplateSlotKind("/nodes/[nodeIndex]/weights/{nodeRef}", "nodeIndex", "ref"))
            .toEqual("/nodes/{nodeIndex}/weights/{nodeRef}");
    });

    it("keeps ref available as a standard authoring type", () => {
        expect(standardTypes.some((type) => type.signature === "ref")).toBe(true);
    });
});
