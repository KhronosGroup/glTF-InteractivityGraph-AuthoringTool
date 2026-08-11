import { IInteractivityConfigurationValue } from "../BasicBehaveEngine/types/InteractivityGraph";
import { AuthoredNode, AuthoredValue } from "./spec/AuthoredGraph";
import { parseVariableIdConfig } from "./socketReconciler";

/**
 * Graph variables and custom events are referenced from nodes by their *index* into
 * graph.variables / graph.events, never by name. Deleting one therefore shifts every higher index
 * down by one and silently re-points every node that used them — a failure with no error and no
 * visible symptom until the graph runs. This module owns finding those references and rewriting
 * them as part of the deletion.
 *
 * Which configuration keys hold an index is driven by the key *name*, not the node op — the same
 * convention computeConfigDrivenSockets uses (it keys off `configuration.variable` /
 * `.variables` / `.event` regardless of op), so the two passes can never disagree about what a
 * given node references.
 */

export type ReferenceKind = "variable" | "event";

// configuration keys holding a single index, per list they index into
const SINGLE_INDEX_CONFIG_KEYS: Record<ReferenceKind, string> = {
    variable: "variable", // variable/get, variable/interpolate
    event: "event",       // event/send, event/receive
};

// configuration key holding an *array* of variable indices (variable/set). This one also names the
// node's input value sockets after each index, so remapping it renames sockets too.
const VARIABLE_LIST_CONFIG_KEY = "variables";

/**
 * An input value socket whose name changed (or disappeared) because the variable it was named
 * after moved. The canvas owns the reactflow edges, so it retargets them from this.
 */
export interface SocketRemap {
    nodeUid: string;
    from: string;
    /** null when the socket is gone (its variable was the deleted one) — drop any edge into it */
    to: string | null;
}

/** a node's reference to the index being deleted, for the pre-delete confirmation */
export interface ReferenceUsage {
    node: AuthoredNode;
    /** position in graph.nodes, matching how the diagnostics panel identifies nodes */
    nodeIndex: number;
}

// A configuration entry counts as an index reference only when it holds a concrete non-negative
// integer. An unset entry ([undefined], or [null] after the spec's JSON round-trip) means "no
// selection" and must survive a remap untouched.
const asIndex = (raw: any): number | undefined => {
    if (raw == null || raw === "") { return undefined; }
    const index = Number(raw);
    return Number.isInteger(index) && index >= 0 ? index : undefined;
};

const readSingleIndex = (node: AuthoredNode, kind: ReferenceKind): number | undefined =>
    asIndex(node.configuration?.[SINGLE_INDEX_CONFIG_KEYS[kind]]?.value?.[0]);

const readVariableList = (node: AuthoredNode): number[] | undefined => {
    const config = node.configuration?.[VARIABLE_LIST_CONFIG_KEY];
    if (config === undefined) { return undefined; }
    return parseVariableIdConfig(config.value)
        .map(asIndex)
        .filter((index): index is number => index !== undefined);
};

/** every index of `kind` that `node` references, deduplicated */
export const getNodeReferences = (node: AuthoredNode, kind: ReferenceKind): number[] => {
    const indices = new Set<number>();
    const single = readSingleIndex(node, kind);
    if (single !== undefined) { indices.add(single); }
    if (kind === "variable") {
        for (const index of readVariableList(node) ?? []) { indices.add(index); }
    }
    return [...indices];
};

/** the nodes that reference `index`, so a delete can say what it is about to break */
export const findReferencingNodes = (
    nodes: AuthoredNode[],
    kind: ReferenceKind,
    index: number,
): ReferenceUsage[] => {
    const usages: ReferenceUsage[] = [];
    nodes.forEach((node, nodeIndex) => {
        if (getNodeReferences(node, kind).includes(index)) {
            usages.push({ node, nodeIndex });
        }
    });
    return usages;
};

/**
 * How many nodes reference each index, in one pass over the graph — the editors show this per row,
 * so a per-row findReferencingNodes would be O(nodes x rows) on every keystroke.
 * Indices with no references are absent.
 */
export const countReferencesByIndex = (
    nodes: AuthoredNode[],
    kind: ReferenceKind,
): Map<number, number> => {
    const counts = new Map<number, number>();
    for (const node of nodes) {
        for (const index of getNodeReferences(node, kind)) {
            counts.set(index, (counts.get(index) ?? 0) + 1);
        }
    }
    return counts;
};

/** every node carrying at least one reference of `kind`, whatever index it points at */
export const findNodesWithReferences = (nodes: AuthoredNode[], kind: ReferenceKind): AuthoredNode[] =>
    nodes.filter((node) => getNodeReferences(node, kind).length > 0);

// how an index moves when the entry at `deletedIndex` is removed: everything above it shifts down,
// the deleted one itself has no replacement
const shift = (index: number, deletedIndex: number): number | undefined => {
    if (index === deletedIndex) { return undefined; }
    return index > deletedIndex ? index - 1 : index;
};

const writeConfig = (node: AuthoredNode, key: string, value: any[]): void => {
    node.configuration = node.configuration ?? {};
    const existing: IInteractivityConfigurationValue | undefined = node.configuration[key];
    node.configuration[key] = { ...(existing ?? {}), value };
};

/**
 * Rewrite every node reference to survive deleting entry `deletedIndex` from graph.variables /
 * graph.events. Mutates `nodes` in place (matching how the rest of the editor edits the model) and
 * returns the input-socket renames the canvas still has to apply to its reactflow edges.
 *
 * Must run while `nodes` still matches the *pre-delete* list, and the caller must then remove the
 * entry itself — this only fixes up the references to it.
 *
 * A node that pointed at the deleted entry is reset to "no selection" ([undefined], the same state
 * a freshly added node carries) rather than being left pointing at whatever slid into that slot.
 */
export const remapReferencesAfterDelete = (
    nodes: AuthoredNode[],
    kind: ReferenceKind,
    deletedIndex: number,
): SocketRemap[] => {
    const socketRemaps: SocketRemap[] = [];
    const singleKey = SINGLE_INDEX_CONFIG_KEYS[kind];

    for (const node of nodes) {
        const single = readSingleIndex(node, kind);
        if (single !== undefined) {
            const next = shift(single, deletedIndex);
            if (next !== single) {
                writeConfig(node, singleKey, [next]);
            }
        }

        if (kind !== "variable") { continue; }
        const list = readVariableList(node);
        // no resolvable ids: nothing to shift, and rewriting would only churn an unset config
        if (list === undefined || list.length === 0) { continue; }

        // Drop the deleted id and shift the rest. The stored value is normalised to a number array
        // here even if it arrived as legacy text — the shifted ids have to round-trip through the
        // socket names below, and those are only predictable in the canonical form.
        const nextList = list
            .map((index) => shift(index, deletedIndex))
            .filter((index): index is number => index !== undefined);
        writeConfig(node, VARIABLE_LIST_CONFIG_KEY, nextList);

        // variable/set names each input value socket after the variable id it writes to, so the
        // sockets move with the ids. Build a fresh record rather than renaming in place: shifting
        // down means the new name is one an existing socket may still hold.
        const inputs = node.values?.input;
        if (inputs === undefined || node.uid === undefined) { continue; }
        const nextInputs: Record<string, AuthoredValue> = {};
        for (const [socket, value] of Object.entries(inputs)) {
            const socketIndex = asIndex(socket);
            // a non-numeric socket on this node isn't index-named, so it is left alone
            if (socketIndex === undefined) {
                nextInputs[socket] = value;
                continue;
            }
            const nextIndex = shift(socketIndex, deletedIndex);
            if (nextIndex === undefined) {
                socketRemaps.push({ nodeUid: node.uid, from: socket, to: null });
                continue;
            }
            const nextSocket = String(nextIndex);
            nextInputs[nextSocket] = value;
            if (nextSocket !== socket) {
                socketRemaps.push({ nodeUid: node.uid, from: socket, to: nextSocket });
            }
        }
        node.values = node.values ?? {};
        node.values.input = nextInputs;
    }

    return socketRemaps;
};

/** a reference pointing past the end of the list it indexes into */
export interface DanglingReference {
    kind: ReferenceKind;
    /** the configuration key carrying it, so the warning can name what to fix */
    configKey: string;
    index: number;
}

/**
 * References that no longer resolve — left behind by a graph authored against a longer
 * variable/event list, or by a hand-edited file. Surfaced as a live node warning so an already
 * damaged graph is visible rather than silently mis-executing.
 */
export const findDanglingReferences = (
    node: AuthoredNode,
    variableCount: number,
    eventCount: number,
): DanglingReference[] => {
    const dangling: DanglingReference[] = [];
    const countFor: Record<ReferenceKind, number> = { variable: variableCount, event: eventCount };

    for (const kind of ["variable", "event"] as ReferenceKind[]) {
        const single = readSingleIndex(node, kind);
        if (single !== undefined && single >= countFor[kind]) {
            dangling.push({ kind, configKey: SINGLE_INDEX_CONFIG_KEYS[kind], index: single });
        }
    }
    for (const index of readVariableList(node) ?? []) {
        if (index >= variableCount) {
            dangling.push({ kind: "variable", configKey: VARIABLE_LIST_CONFIG_KEY, index });
        }
    }
    return dangling;
};
