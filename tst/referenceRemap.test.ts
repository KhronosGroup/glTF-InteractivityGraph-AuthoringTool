import { AuthoredNode } from "../src/authoring/spec/AuthoredGraph";
import {
    countReferencesByIndex,
    findDanglingReferences,
    findNodesWithReferences,
    findReferencingNodes,
    getNodeReferences,
    remapReferencesAfterDelete,
} from "../src/authoring/referenceRemap";

const variableGet = (uid: string, variable: any): AuthoredNode => ({
    uid,
    op: "variable/get",
    declaration: -1,
    configuration: { variable: { value: [variable] } },
    values: { input: {}, output: { value: { type: 1, value: [undefined] } } },
});

// variable/set names each input value socket after the variable id it writes to
const variableSet = (uid: string, ids: number[], wiredFrom: Record<string, string> = {}): AuthoredNode => ({
    uid,
    op: "variable/set",
    declaration: -1,
    configuration: { variables: { value: ids } },
    values: {
        input: Object.fromEntries(ids.map((id) => [
            String(id),
            wiredFrom[String(id)] !== undefined
                ? { node: wiredFrom[String(id)], socket: "value" }
                : { type: 1, value: [id * 100] },
        ])),
        output: {},
    },
});

const eventSend = (uid: string, event: any): AuthoredNode => ({
    uid,
    op: "event/send",
    declaration: -1,
    configuration: { event: { value: [event] } },
    values: { input: {}, output: {} },
});

const configValue = (node: AuthoredNode, key: string) => node.configuration?.[key]?.value;

describe("getNodeReferences", () => {
    it("reads a single-index config", () => {
        expect(getNodeReferences(variableGet("n", 3), "variable")).toEqual([3]);
        expect(getNodeReferences(eventSend("n", 2), "event")).toEqual([2]);
    });

    it("reads the multi-variable list, deduplicated against the single key", () => {
        expect(getNodeReferences(variableSet("n", [0, 2, 2]), "variable")).toEqual([0, 2]);
    });

    it("treats an unset config as no reference", () => {
        expect(getNodeReferences(variableGet("n", undefined), "variable")).toEqual([]);
        // a freshly added node round-trips the spec's [undefined] to [null]
        expect(getNodeReferences(variableGet("n", null), "variable")).toEqual([]);
        expect(getNodeReferences(variableGet("n", -1), "variable")).toEqual([]);
    });

    it("does not confuse the two kinds", () => {
        expect(getNodeReferences(eventSend("n", 2), "variable")).toEqual([]);
        expect(getNodeReferences(variableGet("n", 2), "event")).toEqual([]);
    });

    it("parses the legacy comma/bracket string form of the variables config", () => {
        const node: AuthoredNode = { uid: "n", op: "variable/set", declaration: -1, configuration: { variables: { value: ["[0,2]"] } } };
        expect(getNodeReferences(node, "variable")).toEqual([0, 2]);
    });
});

describe("findReferencingNodes / countReferencesByIndex", () => {
    const nodes = [variableGet("a", 1), variableGet("b", 2), variableSet("c", [1, 3]), eventSend("d", 1)];

    it("finds every node using a given variable index", () => {
        expect(findReferencingNodes(nodes, "variable", 1).map((u) => u.node.uid)).toEqual(["a", "c"]);
    });

    it("reports the node's position in the graph alongside it", () => {
        expect(findReferencingNodes(nodes, "variable", 2)).toEqual([{ node: nodes[1], nodeIndex: 1 }]);
    });

    it("counts every index in one pass", () => {
        expect(countReferencesByIndex(nodes, "variable")).toEqual(new Map([[1, 2], [2, 1], [3, 1]]));
        expect(countReferencesByIndex(nodes, "event")).toEqual(new Map([[1, 1]]));
    });

    it("collects the nodes carrying a reference of a kind, whatever index", () => {
        expect(findNodesWithReferences(nodes, "event").map((n) => n.uid)).toEqual(["d"]);
    });
});

describe("remapReferencesAfterDelete", () => {
    it("shifts indices above the deleted one down by one", () => {
        const node = variableGet("a", 3);
        remapReferencesAfterDelete([node], "variable", 1);
        expect(configValue(node, "variable")).toEqual([2]);
    });

    it("leaves indices below the deleted one alone", () => {
        const node = variableGet("a", 0);
        remapReferencesAfterDelete([node], "variable", 1);
        expect(configValue(node, "variable")).toEqual([0]);
    });

    it("resets a node pointing at the deleted entry to no selection", () => {
        const node = variableGet("a", 1);
        remapReferencesAfterDelete([node], "variable", 1);
        // never left pointing at whatever slid into the freed slot
        expect(configValue(node, "variable")).toEqual([undefined]);
    });

    it("remaps event references the same way", () => {
        const [hit, above, below] = [eventSend("a", 1), eventSend("b", 2), eventSend("c", 0)];
        remapReferencesAfterDelete([hit, above, below], "event", 1);
        expect(configValue(hit, "event")).toEqual([undefined]);
        expect(configValue(above, "event")).toEqual([1]);
        expect(configValue(below, "event")).toEqual([0]);
    });

    it("does not touch references of the other kind", () => {
        const node = eventSend("a", 3);
        remapReferencesAfterDelete([node], "variable", 1);
        expect(configValue(node, "event")).toEqual([3]);
    });

    it("drops the deleted id from a multi-variable list and shifts the rest", () => {
        const node = variableSet("a", [0, 1, 2]);
        remapReferencesAfterDelete([node], "variable", 1);
        expect(configValue(node, "variables")).toEqual([0, 1]);
    });

    it("renames variable/set's index-named input sockets to match, preserving their values", () => {
        const node = variableSet("a", [0, 2]);
        remapReferencesAfterDelete([node], "variable", 1);
        // variable 2 became variable 1; its socket moves with it and keeps what was on it
        expect(Object.keys(node.values!.input!)).toEqual(["0", "1"]);
        expect(node.values!.input!["1"].value).toEqual([200]);
    });

    it("reports the socket renames so wires can follow", () => {
        const node = variableSet("a", [0, 2, 3]);
        const remaps = remapReferencesAfterDelete([node], "variable", 1);
        expect(remaps).toEqual([
            { nodeUid: "a", from: "2", to: "1" },
            { nodeUid: "a", from: "3", to: "2" },
        ]);
    });

    it("reports a null target for the socket whose variable was deleted", () => {
        const node = variableSet("a", [1, 2]);
        const remaps = remapReferencesAfterDelete([node], "variable", 1);
        expect(remaps).toContainEqual({ nodeUid: "a", from: "1", to: null });
        expect(Object.keys(node.values!.input!)).toEqual(["1"]);
    });

    it("does not let a shifted socket clobber the one already holding its new name", () => {
        // sockets 1 and 2 both exist; deleting variable 0 shifts them to 0 and 1 with no collision
        const node = variableSet("a", [1, 2]);
        remapReferencesAfterDelete([node], "variable", 0);
        expect(Object.keys(node.values!.input!)).toEqual(["0", "1"]);
        expect(node.values!.input!["0"].value).toEqual([100]);
        expect(node.values!.input!["1"].value).toEqual([200]);
    });

    it("keeps a wired socket's upstream link across the rename", () => {
        const node = variableSet("a", [2], { "2": "upstream-uid" });
        remapReferencesAfterDelete([node], "variable", 0);
        expect(node.values!.input!["1"]).toEqual({ node: "upstream-uid", socket: "value" });
    });

    it("leaves a non-numeric socket on the node untouched", () => {
        const node = variableSet("a", [2]);
        node.values!.input!["in"] = { type: 1, value: [7] };
        remapReferencesAfterDelete([node], "variable", 0);
        expect(node.values!.input!["in"]).toEqual({ type: 1, value: [7] });
    });

    it("remaps every node in the graph in one call", () => {
        const nodes = [variableGet("a", 2), variableSet("b", [2, 3]), variableGet("c", 0)];
        remapReferencesAfterDelete(nodes, "variable", 1);
        expect(configValue(nodes[0], "variable")).toEqual([1]);
        expect(configValue(nodes[1], "variables")).toEqual([1, 2]);
        expect(configValue(nodes[2], "variable")).toEqual([0]);
    });
});

describe("findDanglingReferences", () => {
    it("flags an index past the end of the list", () => {
        expect(findDanglingReferences(variableGet("a", 3), 2, 0)).toEqual([
            { kind: "variable", configKey: "variable", index: 3 },
        ]);
    });

    it("flags a dangling event index", () => {
        expect(findDanglingReferences(eventSend("a", 0), 0, 0)).toEqual([
            { kind: "event", configKey: "event", index: 0 },
        ]);
    });

    it("flags dangling entries inside a multi-variable list", () => {
        expect(findDanglingReferences(variableSet("a", [0, 5]), 1, 0)).toEqual([
            { kind: "variable", configKey: "variables", index: 5 },
        ]);
    });

    it("accepts an in-range reference", () => {
        expect(findDanglingReferences(variableGet("a", 1), 2, 0)).toEqual([]);
        expect(findDanglingReferences(eventSend("a", 1), 0, 2)).toEqual([]);
    });

    it("treats an unset reference as fine, not dangling", () => {
        expect(findDanglingReferences(variableGet("a", null), 0, 0)).toEqual([]);
        expect(findDanglingReferences(variableGet("a", -1), 0, 0)).toEqual([]);
    });

    it("reports nothing after a delete has been remapped", () => {
        const nodes = [variableGet("a", 2), variableSet("b", [1, 2])];
        remapReferencesAfterDelete(nodes, "variable", 1);
        // the list is one shorter now
        expect(nodes.flatMap((n) => findDanglingReferences(n, 2, 0))).toEqual([]);
    });
});
