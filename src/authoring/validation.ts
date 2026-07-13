import { IInteractivityVariable } from "../BasicBehaveEngine/types/InteractivityGraph";
import { AuthoredNode, AuthoredValue } from "./spec/AuthoredGraph";
import { getTypeGroupMembers, interactivityNodeSpecs, resolveOutputSocketType, resolveTypeGroupType } from "./spec/nodes";
import { getTypeLabel } from "./socketColors";

/**
 * Model-driven live socket validation — the single source of truth for the per-node "live"
 * warnings (missing values, wired type mismatches, type-group conflicts). Operates purely on the
 * graph model, so the result is independent of what is currently mounted/visible on the canvas
 * (viewport culling, LOD, mount order must never change the diagnostics for a graph). The node UI
 * reads the outcome back from context (nodeWarnings) instead of recomputing per render.
 */

export interface NodeLiveWarning {
    // input socket the warning is attributed to, so the node UI can flag it inline
    socket: string;
    message: string;
}

// variable/set keys its input value sockets by the numeric variable id; show the variable's name
// instead so the warning stays identifiable without cross-referencing the "variables" config
const getInputSocketFullLabel = (node: AuthoredNode, socket: string, variables: IInteractivityVariable[]): string => {
    if (node.op === "variable/set") {
        const variable = variables[Number(socket)] as (IInteractivityVariable & { id?: string }) | undefined;
        const name = variable?.name ?? variable?.id;
        if (name) { return name; }
    }
    return socket;
};

/**
 * Determine the effective type of an input socket. A wired socket takes its type from the
 * connected source output socket (auto-detected), so its own type/typeOptions are ignored.
 * Otherwise, a grouped socket adopts its group's resolved type (so ungrouped-but-linked siblings
 * stay visually consistent); finally fall back to the socket's own type. Shared with the node UI
 * (badge/handle colors), so the warning and the display always agree.
 */
export const resolveInputSocketType = (
    node: AuthoredNode,
    spec: AuthoredNode | undefined,
    socket: string,
    value: AuthoredValue,
    graphNodes: AuthoredNode[],
    byUid?: Map<string, AuthoredNode>,
): number | undefined => {
    const link = node.values?.input?.[socket] ?? value;
    if (link?.node !== undefined) {
        const sourceNode = byUid !== undefined ? byUid.get(String(link.node)) : graphNodes.find((n) => n.uid === link.node);
        // group-aware resolution of the source output (matches the wire color) — see getOwnSocketType
        const sourceType = resolveOutputSocketType(sourceNode, link.socket!, graphNodes);
        if (sourceType !== undefined) {
            return sourceType;
        }
    }
    const group = value.typeGroup ?? spec?.values?.input?.[socket]?.typeGroup;
    if (group !== undefined) {
        const groupType = resolveTypeGroupType(node, spec, group, graphNodes);
        if (groupType !== undefined) { return groupType; }
    }
    return value?.type;
};

// A socket's own effective type, ignoring the group's collapsed resolution: a wire's source type
// if wired, otherwise the socket's own stored `type` (whatever the type dropdown last set it to).
// Needed because resolveInputSocketType folds every unwired grouped socket into ONE shared answer
// (resolveTypeGroupType picks a single winner for the whole group), so comparing via it can never
// see two differing unwired members, and — since that winner requires an actual static *value* to
// be present, not just a type — it also ignores a type the user just picked from the dropdown
// until a value is entered, making the group-conflict check silently stale right after a manual
// type change.
const getOwnSocketType = (
    node: AuthoredNode,
    socket: string,
    value: AuthoredValue,
    graphNodes: AuthoredNode[],
    byUid: Map<string, AuthoredNode> | undefined,
): number | undefined => {
    const link = node.values?.input?.[socket] ?? value;
    if (link?.node !== undefined) {
        const sourceNode = byUid !== undefined ? byUid.get(String(link.node)) : graphNodes.find((n) => n.uid === link.node);
        // Resolve the source's output the same way its outgoing wire is colored — group-aware —
        // instead of reading the raw stored `.type`, which can be a stale spec-default placeholder
        // while the wire is correctly resolved (see resolveOutputSocketType).
        return resolveOutputSocketType(sourceNode, link.socket!, graphNodes);
    }
    return value?.type;
};

// Detect a wired input socket whose connected source outputs a type this socket doesn't declare
// as acceptable (its spec `typeOptions` — the same set `hasIntersection` checks against at
// connect time in AuthoringComponent). This can drift out of sync with the wire after the initial
// connection: connecting to a "configurable" socket (variable/set, event/send, pointer/get, ...)
// skips that check entirely, and a source's output type can change later (type dropdown,
// typeGroup resolution) without re-validating existing wires.
const getInputTypeMismatch = (
    node: AuthoredNode,
    spec: AuthoredNode | undefined,
    socket: string,
    value: AuthoredValue,
    resolvedType: number | undefined,
    variables: IInteractivityVariable[],
): string | undefined => {
    const link = node.values?.input?.[socket] ?? value;
    if (link?.node === undefined || resolvedType === undefined) { return undefined; }
    const expectedTypeOptions = spec?.values?.input?.[socket]?.typeOptions ?? value.typeOptions;
    if (expectedTypeOptions === undefined || expectedTypeOptions.includes(resolvedType)) { return undefined; }
    const expectedLabel = expectedTypeOptions.map((t) => getTypeLabel(t)).join(" | ");
    return `Type mismatch on socket "${getInputSocketFullLabel(node, socket, variables)}": wired value is ${getTypeLabel(resolvedType)}, but this socket expects ${expectedLabel}`;
};

// Detect an input socket whose own type disagrees with a sibling in the same typeGroup — e.g.
// math/add's `a` and `b` share a group (both must be the same concrete type), so wiring an int
// into `a` and a float into `b` is invalid even though each individually satisfies its own
// typeOptions, and so is picking `b`'s type dropdown to float while `a` is wired to int.
// Membership is read from the immutable spec since a wired socket's live object loses its
// `typeGroup` tag (see getTypeGroupMembers). Every member that disagrees with at least one
// sibling is flagged, since there's no way to tell which one is "correct".
const getGroupTypeConflict = (
    node: AuthoredNode,
    spec: AuthoredNode | undefined,
    socket: string,
    value: AuthoredValue,
    graphNodes: AuthoredNode[],
    byUid: Map<string, AuthoredNode> | undefined,
    variables: IInteractivityVariable[],
): string | undefined => {
    const group = value.typeGroup ?? spec?.values?.input?.[socket]?.typeGroup;
    if (group === undefined) { return undefined; }
    const ownType = getOwnSocketType(node, socket, value, graphNodes, byUid);
    if (ownType === undefined) { return undefined; }
    const inputValues = node.values?.input ?? {};
    const { inputs } = getTypeGroupMembers(spec, group);
    const conflicting: string[] = [];
    for (const name of inputs) {
        if (name === socket) { continue; }
        const siblingValue = inputValues[name];
        if (siblingValue === undefined) { continue; }
        const siblingType = getOwnSocketType(node, name, siblingValue, graphNodes, byUid);
        if (siblingType !== undefined && siblingType !== ownType) {
            conflicting.push(`${name}: ${getTypeLabel(siblingType)}`);
        }
    }
    if (conflicting.length === 0) { return undefined; }
    return `Type group mismatch on socket "${getInputSocketFullLabel(node, socket, variables)}": this socket is ${getTypeLabel(ownType)}, but a sibling socket sharing the same type must match (${conflicting.join(", ")})`;
};

// KHR_interactivity requires every input socket to either be wired or carry a static value — an
// unconnected socket left at its "no value entered yet" placeholder (undefined/NaN/empty string,
// depending on the socket's shape) would export as invalid.
const getMissingValueWarning = (
    node: AuthoredNode,
    socket: string,
    value: AuthoredValue,
    variables: IInteractivityVariable[],
): string | undefined => {
    if (node.values?.input?.[socket]?.node !== undefined) { return undefined; }
    // ref sockets store their pointer array-wrapped, but older graphs may still carry a bare
    // string; normalize both shapes before checking.
    const raw = value.value;
    const values = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
    const isUnset = values.length === 0 ||
        values.every((v) => v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v)));
    if (!isUnset) { return undefined; }
    return `Missing value on socket "${getInputSocketFullLabel(node, socket, variables)}": not connected and has no value set`;
};

/**
 * All live socket warnings for one node, computed purely from the model. At most one warning per
 * input socket, in fixed priority: wired type mismatch, then type-group conflict, then missing
 * value — matching what the node UI has always surfaced.
 *
 * A NoOp (an op without a registry spec) yields no live warnings: its declaration-seeded sockets
 * carry no typeOptions/typeGroups to check, and the unsupported op itself is already surfaced by
 * the load-time "Unsupported node operation" diagnostic.
 */
export const computeNodeLiveWarnings = (
    node: AuthoredNode,
    graphNodes: AuthoredNode[],
    variables: IInteractivityVariable[],
    byUid?: Map<string, AuthoredNode>,
): NodeLiveWarning[] => {
    const spec = interactivityNodeSpecs.find((n) => n.op === node.op);
    if (spec === undefined) { return []; }
    const warnings: NodeLiveWarning[] = [];
    for (const [socket, value] of Object.entries(node.values?.input ?? {})) {
        const resolvedType = resolveInputSocketType(node, spec, socket, value, graphNodes, byUid);
        const message =
            getInputTypeMismatch(node, spec, socket, value, resolvedType, variables)
            ?? getGroupTypeConflict(node, spec, socket, value, graphNodes, byUid, variables)
            ?? getMissingValueWarning(node, socket, value, variables);
        if (message !== undefined) {
            warnings.push({ socket, message });
        }
    }
    return warnings;
};

/**
 * Live socket warnings for the whole graph, keyed by node uid (nodes without warnings are
 * omitted). Synchronous convenience used by tests; the interactive path chunks the same per-node
 * call across frames (see runLiveValidation in InteractivityGraphContext).
 */
export const computeGraphLiveWarnings = (
    graphNodes: AuthoredNode[],
    variables: IInteractivityVariable[],
): Map<string, NodeLiveWarning[]> => {
    const byUid = buildNodeByUidMap(graphNodes);
    const result = new Map<string, NodeLiveWarning[]>();
    for (const node of graphNodes) {
        if (node.uid === undefined) { continue; }
        const warnings = computeNodeLiveWarnings(node, graphNodes, variables, byUid);
        if (warnings.length > 0) {
            result.set(node.uid, warnings);
        }
    }
    return result;
};

// one uid -> node map per validation run, so the per-socket source lookups don't rescan the node
// list (the group resolvers in nodes.ts still take the array — see their own byUid follow-up)
export const buildNodeByUidMap = (graphNodes: AuthoredNode[]): Map<string, AuthoredNode> => {
    const byUid = new Map<string, AuthoredNode>();
    for (const node of graphNodes) {
        if (node.uid !== undefined) { byUid.set(node.uid, node); }
    }
    return byUid;
};
