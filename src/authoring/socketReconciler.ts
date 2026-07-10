import { IInteractivityFlow, IInteractivityConfigurationValue, IInteractivityEvent, IInteractivityVariable, InteractivityValueType } from "../BasicBehaveEngine/types/InteractivityGraph";
import { AuthoredValue } from "./spec/AuthoredGraph";
import { anyType, standardTypes } from "./spec/nodes";
import { buildPointerSlotValue, getMessageTemplateSocketIds, getPathTemplateSockets, getRefSlotPointerPrefix } from "./pathTemplate";

const getStandardTypeIndex = (signature: InteractivityValueType): number => {
    const index = standardTypes.findIndex((type) => type.signature === signature);
    if (index === -1) {
        throw new Error(`Missing standard KHR_interactivity type ${signature}`);
    }
    return index;
};

export interface SocketReconcilerContext {
    nodeType: string | undefined;
    events: Record<number, IInteractivityEvent>;
    variables: IInteractivityVariable[];
}

export interface GeneratedSockets {
    inputValues: Record<string, AuthoredValue>;
    outputValues: Record<string, AuthoredValue>;
    inputFlows: Record<string, IInteractivityFlow>;
    outputFlows: Record<string, IInteractivityFlow>;
    // pointer template slot id -> its required type, so a slot whose kind (index/ref) changed
    // adopts the new type instead of keeping the stale socket
    pointerSlotTypeById: Map<string, number>;
    // pointer slots whose loaded value was already preserved/normalized here; the generic merge
    // must not overwrite these with the raw loaded value (which would undo the int->"/nodes/3"
    // ref normalization)
    preservedPointerSlotIds: Set<string>;
}

/**
 * Derive the sockets a node's *configuration* dictates should exist (e.g. flow/switch's `cases`,
 * pointer/get's pointer template, event/send's selected custom event). This isolates per-op
 * knowledge from the generic merge/preservation rules in mergeValueSockets/mergeFlowSockets.
 * Pure and side-effect free — never mutates its inputs, never aborts early (a node referencing a
 * stale/deleted event or variable id just skips that one config key instead of dropping every
 * other socket on the node).
 */
export function computeConfigDrivenSockets(
    updatedConfiguration: Record<string, IInteractivityConfigurationValue>,
    inputValues: Record<string, AuthoredValue>,
    ctx: SocketReconcilerContext
): GeneratedSockets {
    const { nodeType, events, variables } = ctx;

    const inputValuesToSet: Record<string, AuthoredValue> = {};
    const outputValuesToSet: Record<string, AuthoredValue> = {};
    const inputFlowsToSet: Record<string, IInteractivityFlow> = {};
    const outputFlowsToSet: Record<string, IInteractivityFlow> = {};
    const pointerSlotTypeById = new Map<string, number>();
    const preservedPointerSlotIds = new Set<string>();

    if (updatedConfiguration.inputFlows !== undefined) {
        const numberInputFlows = Number(updatedConfiguration.inputFlows.value?.[0] || 0);
        for (let i = 0; i < numberInputFlows; i++) {
            inputFlowsToSet[`${i}`] = { node: undefined, socket: undefined };
        }
    }

    if (updatedConfiguration.cases !== undefined) {
        let cases = updatedConfiguration.cases.value || "";
        // Allow input formats in the UI, such as:
        // - 0,1, (while typing)
        // - [0,1,2 (while typing)
        // - [0,1,2]
        // - 0,1,2
        if (typeof cases[0] === "string") {
            let casesString = cases[0];
            if (casesString.endsWith(",")) casesString = casesString.slice(0, -1);
            casesString = casesString.replace(/\s/g, "");
            if (!casesString.startsWith("[")) casesString = `[${casesString}`;
            if (!casesString.endsWith("]")) casesString = `${casesString}]`;
            try {
                cases = JSON.parse(casesString);
            } catch (e) {
                console.error("Couldn't parse configuration array string: ", casesString, e);
                cases = [];
            }
        }
        if (nodeType === "flow/switch") {
            for (let i = 0; i < cases.length; i++) {
                outputFlowsToSet[`${cases[i]}`] = { node: undefined, socket: undefined };
            }
        } else if (nodeType === "math/switch") {
            for (let i = 0; i < cases.length; i++) {
                inputValuesToSet[`${cases[i]}`] = { value: [undefined], typeOptions: anyType, typeGroup: "T", type: 0 };
            }
        }
    }

    if (updatedConfiguration.event !== undefined && updatedConfiguration.event.value?.[0] != null) {
        const customEventId = Number(updatedConfiguration.event.value?.[0]);
        const ce: IInteractivityEvent | undefined = events?.[customEventId];
        if (ce?.values !== undefined) {
            for (const key of Object.keys(ce.values)) {
                const currentValue = inputValues[key];
                const type = ce.values[key].type;
                const value: AuthoredValue = { value: [undefined], typeOptions: [type], type };
                const valueToSet = currentValue === undefined ? value : currentValue;
                if (nodeType === "event/send") {
                    inputValuesToSet[key] = valueToSet;
                } else if (nodeType === "event/receive") {
                    outputValuesToSet[key] = valueToSet;
                }
            }
        }
    }

    if (updatedConfiguration.pointer !== undefined) {
        const template = updatedConfiguration.pointer.value?.[0] || "";
        const sockets = getPathTemplateSockets(template);
        const intTypeIndex = getStandardTypeIndex(InteractivityValueType.INT);
        const refTypeIndex = getStandardTypeIndex(InteractivityValueType.REF);
        for (const socket of sockets) {
            const type = socket.kind === "index" ? intTypeIndex : refTypeIndex;
            // preserve a value/wire the slot already carries (e.g. a pointer loaded from a glTF
            // file) instead of resetting it to [undefined]; a ref slot storing a bare integer
            // index (spec-compliant files) is normalized to its "/nodes/3" pointer string. Only a
            // truly-empty slot is marked for the stale-socket reset below, so a loaded value whose
            // stored type differs from the delimiter-derived type is kept (see buildPointerSlotValue).
            const refPrefix = socket.kind === "ref" ? getRefSlotPointerPrefix(template, socket.id) : undefined;
            const { value, preserved } = buildPointerSlotValue(inputValues[socket.id], socket.kind, type, refPrefix);
            inputValuesToSet[socket.id] = value;
            if (preserved) {
                preservedPointerSlotIds.add(socket.id);
            } else {
                pointerSlotTypeById.set(socket.id, type);
            }
        }
    }

    if (updatedConfiguration.message !== undefined) {
        const vals = getMessageTemplateSocketIds(updatedConfiguration.message.value?.[0] || "");
        for (const id of vals) {
            inputValuesToSet[id] = { value: [undefined], typeOptions: anyType, type: 0 };
        }
    }

    if (updatedConfiguration.easingType !== undefined) {
        if (updatedConfiguration.easingType.value?.[0] === "0") {
            // CUBIC BEZIER
            inputValuesToSet["cp1"] = { value: [NaN, NaN], typeOptions: [2], type: 2 };
            inputValuesToSet["cp2"] = { value: [NaN, NaN], typeOptions: [2], type: 2 };
        }
    }

    if (updatedConfiguration.variable !== undefined && updatedConfiguration.variable.value?.[0] != null) {
        const variableId = Number(updatedConfiguration.variable.value?.[0] || 0);
        const v: IInteractivityVariable | undefined = variables?.[variableId];
        if (v !== undefined) {
            const valueToSet: AuthoredValue = { typeOptions: [v.type], type: v.type, value: [undefined] };
            if (nodeType === "variable/interpolate") {
                inputValuesToSet["value"] = valueToSet;
            } else if (nodeType === "variable/get") {
                outputValuesToSet["value"] = valueToSet;
            }
        }
    }

    if (updatedConfiguration.variables !== undefined) {
        let variableIds = updatedConfiguration.variables.value || "";
        // Allow input formats in the UI, such as:
        // - 0,1, (while typing)
        // - [0,1,2 (while typing)
        // - [0,1,2]
        // - 0,1,2
        if (typeof variableIds[0] === "string") {
            let variablesIdString = variableIds[0];
            if (variablesIdString.endsWith(",")) variablesIdString = variablesIdString.slice(0, -1);
            variablesIdString = variablesIdString.replace(/\s/g, "");
            if (!variablesIdString.startsWith("[")) variablesIdString = `[${variablesIdString}`;
            if (!variablesIdString.endsWith("]")) variablesIdString = `${variablesIdString}]`;
            try {
                variableIds = JSON.parse(variablesIdString);
            } catch (e) {
                console.error("Couldn't parse configuration array string: ", variablesIdString, e);
                variableIds = [];
            }
        }
        for (const variableId of variableIds) {
            if (variableId == null) { continue; }
            const v: IInteractivityVariable | undefined = variables?.[variableId];
            if (v === undefined) { continue; }
            inputValuesToSet[variableId] = { typeOptions: [v.type], type: v.type, value: [undefined] };
        }
    }

    if (updatedConfiguration.type !== undefined) {
        const typeId = Number(updatedConfiguration.type.value?.[0] || 0);
        if (nodeType === "pointer/get") {
            outputValuesToSet["value"] = { typeOptions: [typeId], type: typeId, value: [undefined] };
        } else {
            const noValuePresent = inputValues["value"] === undefined;
            const inlineValuePresent = inputValues["value"] !== undefined && inputValues["value"].node === undefined;
            // only wipe if the value is undefined or the value is inlined but the types are different
            if (noValuePresent || (inlineValuePresent && inputValues["value"].type !== typeId)) {
                inputValuesToSet["value"] = { typeOptions: [typeId], type: typeId, value: [undefined] };
                // mark so the stale-socket-preservation pass doesn't restore the old "value" over this fresh type
                pointerSlotTypeById.set("value", typeId);
            }
        }
    }

    if (updatedConfiguration.stopMode !== undefined) {
        if (updatedConfiguration.stopMode.value?.[0] === "1") {
            // EXACT FRAME TIME
            inputValuesToSet["stopTime"] = { value: [NaN], typeOptions: [2], type: 2 };
        }
    }

    return { inputValues: inputValuesToSet, outputValues: outputValuesToSet, inputFlows: inputFlowsToSet, outputFlows: outputFlowsToSet, pointerSlotTypeById, preservedPointerSlotIds };
}

/**
 * Merge a config-generated + spec-declared value socket set onto the node's existing editor
 * state. Declarative and additive: a key is only ever dropped when it belongs to none of
 * spec/generated/extraKeys, never as a side effect of an unrelated branch. Applied identically to
 * input and output value sockets (see `allowExistingToOverrideGenerated` for their one behavioral
 * difference).
 *
 * Priority per key: preserved (pointer slot already normalized) > existing-with-real-data (unless
 * a pointer slot's kind just changed) > freshly generated > spec default (keeping a resolved
 * type-group's concrete type over the spec's placeholder type) > absent.
 */
export function mergeValueSockets(params: {
    existing: Record<string, AuthoredValue>;
    generated: Record<string, AuthoredValue>;
    specDefaults: Record<string, AuthoredValue>;
    // socket ids present on the node but declared by neither spec nor config; kept as-is so a
    // broken/hand-edited file surfaces instead of silently losing data. Pass [] for ops whose
    // socket set is fully spec/config-driven (see NodeSpecFlag.DynamicSockets).
    extraKeys: string[];
    preservedKeys?: Set<string>;
    pointerSlotTypeById?: Map<string, number>;
    // input sockets: existing real data can still win even over a freshly generated entry (the
    // generator already folds "keep existing if present" into its own output for most keys; this
    // catches the rest, e.g. backfilling a spec description). Output sockets: a freshly generated
    // entry (e.g. pointer/get's chosen output type) is authoritative and must not be reverted.
    allowExistingToOverrideGenerated: boolean;
}): Record<string, AuthoredValue> {
    const { existing, generated, specDefaults, extraKeys, preservedKeys, pointerSlotTypeById, allowExistingToOverrideGenerated } = params;
    const result: Record<string, AuthoredValue> = { ...generated };
    const generatedKeys = new Set(Object.keys(generated));
    const keys = [...Object.keys(specDefaults), ...Object.keys(generated), ...extraKeys];

    for (const key of keys) {
        if (preservedKeys?.has(key)) { continue; }
        if (generatedKeys.has(key) && !allowExistingToOverrideGenerated) { continue; }

        const existingSocket = existing[key];
        const existingHasData = existingSocket !== undefined && (existingSocket.value?.[0] != null || existingSocket.node != null);
        const pointerSlotType = pointerSlotTypeById?.get(key);
        const pointerSlotKindChanged = pointerSlotType !== undefined && existingSocket !== undefined && existingSocket.type !== pointerSlotType;

        if (existingHasData && !pointerSlotKindChanged) {
            // the loaded/wired socket may predate the spec's `description` (e.g. loaded from a
            // glTF file, which has no such field) — backfill it without touching value/connection
            result[key] = existingSocket.description === undefined && specDefaults[key]?.description !== undefined
                ? { ...existingSocket, description: specDefaults[key].description }
                : existingSocket;
        } else if (!existingHasData && !generatedKeys.has(key) && specDefaults[key] !== undefined) {
            // A grouped socket the file/model left without a static value or wire still carries a
            // resolved group type (propagated across connections on load, or set by an earlier
            // type pick). Restoring the bare spec default here would snap it back to the spec's
            // placeholder type, disagreeing with its group + the wired sibling that resolved it.
            const specDefault = specDefaults[key];
            const grouped = (specDefault.typeGroup ?? existingSocket?.typeGroup) !== undefined;
            result[key] = grouped && existingSocket?.type !== undefined && existingSocket.type !== specDefault.type
                ? { ...specDefault, type: existingSocket.type }
                : specDefault;
        }
    }

    return result;
}

/**
 * Merge a config-generated + spec-declared flow socket set onto the node's existing editor state.
 * A connected existing flow always wins over the spec default; a freshly generated (but
 * unconnected) entry is kept when neither an existing connection nor a spec default applies.
 */
export function mergeFlowSockets(params: {
    existing: Record<string, IInteractivityFlow>;
    generated: Record<string, IInteractivityFlow>;
    specDefaults: Record<string, IInteractivityFlow>;
    extraKeys?: string[];
}): Record<string, IInteractivityFlow> {
    const { existing, generated, specDefaults, extraKeys = [] } = params;
    const result: Record<string, IInteractivityFlow> = { ...generated };
    const keys = [...Object.keys(specDefaults), ...Object.keys(generated), ...extraKeys];

    for (const key of keys) {
        if (existing[key] !== undefined && existing[key].node != null) {
            result[key] = existing[key];
        } else if (specDefaults[key] !== undefined) {
            result[key] = specDefaults[key];
        }
    }

    return result;
}
