import { CSSProperties, useCallback, useContext, useEffect, useReducer, useRef, useState } from "react";
import { Handle, Position, useReactFlow, useUpdateNodeInternals } from "reactflow";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

import { RenderIf } from "../components/RenderIf";
import { NodeInfoTooltip, NodeTooltipSections } from "./NodeInfoTooltip";
import { IInteractivityFlow, IInteractivityConfigurationValue, IInteractivityEvent, IInteractivityVariable, InteractivityValueType, InteractivityConfigurationValueType } from "../BasicBehaveEngine/types/InteractivityGraph";
import { AuthoredValue, AuthoredNode, NodeSpecFlag } from "./spec/AuthoredGraph";
import { getTypeGroupMembers, hasNodeSpecFlag, interactivityNodeSpecs, resolveOutputSocketType, resolveTypeGroupType, standardTypes } from "./spec/nodes";
import { InteractivityGraphContext } from "../InteractivityGraphContext";
import { computeConfigDrivenSockets, mergeFlowSockets, mergeValueSockets } from "./socketReconciler";
import { PointerConfigField } from "./PointerConfigField";
import { getStandardTypeIndexForSignature } from "./pointerCatalogue";
import { FLOW_COLOR, getColorForTypeIndex, getNodeCategoryColor, getTypeLabel } from "./socketColors";
import { RefValuePicker } from "./RefValuePicker";
import { BoolSwitch } from "./TypedValueInput";
import { VariablesConfigField } from "./VariablesConfigField";
import { IntArrayConfigField } from "./IntArrayConfigField";
import { InterpolationCurveField, ControlPoint } from "./InterpolationCurveField";
import { CustomEventSendMonitor, CustomEventReceiveTrigger, PointerEventMonitor } from "./CustomEventControls";
import "../css/flowNodes.css";

// a setState-style updater: either the next value directly, or a function of the previous value
type Updater<T> = T | ((prev: T) => T);
const applyUpdate = <T,>(next: Updater<T>, prev: T): T =>
    (typeof next === "function" ? (next as (p: T) => T)(prev) : next);

const refSelectButtonStyle: CSSProperties = {
    height: 30,
    border: "1px solid #ccc",
    borderRadius: 6,
    background: "white",
    cursor: "pointer",
    fontSize: 12,
    color: "#333",
    whiteSpace: "nowrap",
    flexShrink: 0,
    padding: "0 8px",
};

// shared handle styling: a colored dot whose color encodes the socket type (or flow).
// By default reactflow centers the handle vertically over the whole socket (head + input
// control). Pinning `top` to the socket-head's center keeps the dot on the same Y as the
// type badge instead of drifting down when a value input is rendered below the head.
const SOCKET_HEAD_CENTER = 8;
// flow/sequence and flow/multiGate render their renamable output name as a 24px-tall input
// (.flow-node-flow-name) instead of a plain label, which makes that socket-head row taller and
// shifts its visual center down from SOCKET_HEAD_CENTER.
const FLOW_NAME_HEAD_CENTER = 12;
const handleStyle = (color: string, side: "left" | "right", top: number | undefined = SOCKET_HEAD_CENTER): CSSProperties => ({
    background: color,
    width: 11,
    height: 11,
    border: "2px solid #ffffff",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
    [side]: -13,
    ...(top !== undefined ? { top } : {}),
});

export interface IAuthoringGraphNodeProps {
    data: any
    dragging?: boolean
}

// normalizes an `int[]` configuration's raw value into a plain number list. Handles both the
// spec-correct array-of-numbers form and the legacy free-text form (a single comma-separated
// string) that the old raw text field used to store.
const parseIntArrayConfigValue = (raw: any[] | undefined): number[] => {
    if (!Array.isArray(raw) || raw.length === 0) { return []; }
    if (raw.length === 1 && typeof raw[0] === "string") {
        const cleaned = raw[0].replace(/[[\]\s]/g, "");
        if (cleaned === "") { return []; }
        return cleaned.split(",").map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n));
    }
    return raw.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
};

// Vector/matrix socket types get one edit field per component, laid out as rows x cols.
// glTF stores matrices column-major, so the field shown at visual (row r, col c) maps to the
// flat value index c * rows + r. For vectors (rows === 1) this collapses to plain index c.
const VECTOR_MATRIX_LAYOUTS: Partial<Record<InteractivityValueType, { rows: number; cols: number }>> = {
    [InteractivityValueType.FLOAT2]: { rows: 1, cols: 2 },
    [InteractivityValueType.FLOAT3]: { rows: 1, cols: 3 },
    [InteractivityValueType.FLOAT4]: { rows: 1, cols: 4 },
    [InteractivityValueType.FLOAT2X2]: { rows: 2, cols: 2 },
    [InteractivityValueType.FLOAT3X3]: { rows: 3, cols: 3 },
    [InteractivityValueType.FLOAT4X4]: { rows: 4, cols: 4 },
};

// component labels used as tooltips: vectors read x/y/z/w, matrices read m<row><col>
const VECTOR_COMPONENT_LABELS = ["x", "y", "z", "w"];
const getComponentTitle = (layout: { rows: number; cols: number }, row: number, col: number): string => {
    if (layout.rows === 1) {
        return VECTOR_COMPONENT_LABELS[col] ?? `[${col}]`;
    }
    return `m${row}${col}`;
}

/**
 * AuthoringGraphNode component is a React component used to display and edit the properties of an authoring node in a flow-based visual programming environment.
 *
 * @component
 * @param {IAuthoringGraphNodeProps} props - The props for the AuthoringGraphNode component.
 * @param {any} props.data - Additional data related to the node, including configuration, values, and more KHR_interactivity specific values.
 * @returns {JSX.Element} - A JSX element representing the AuthoringGraphNode.
 */

export const AuthoringGraphNode = (props: IAuthoringGraphNodeProps) => {
    const { graph, gltfObjectModel, diagnostics, reportNodeWarnings, markGraphDirty } = useContext(InteractivityGraphContext);
    const updateNodeInternals = useUpdateNodeInternals();
    const { deleteElements } = useReactFlow();
    const uid = props.data.uid;
    const [node, setNode] = useState<AuthoredNode | null>(null);
    // which ref input socket currently has the object picker open (null = closed)
    const [refPickerSocket, setRefPickerSocket] = useState<string | null>(null);
    // whether the node-index configuration's node picker dialog is open
    const [showNodeIndexPicker, setShowNodeIndexPicker] = useState(false);
    const [, forceRender] = useReducer((n: number) => n + 1, 0);

    // `node` (the shared graph model) is the single source of truth for this node's sockets and
    // configuration. These read straight through; the setters below mutate the model in place and
    // force a re-render — replacing the old per-node useState mirrors + writeback effects, which
    // let node and the mirrors drift (the documented root cause of socket-editing bugs).
    const inputFlows = node?.flows?.input ?? {};
    const outputFlows = node?.flows?.output ?? {};
    const inputValues = node?.values?.input ?? {};
    const outputValues = node?.values?.output ?? {};
    const configuration = node?.configuration ?? {};

    // The config-driven socket reconciler (evaluateConfigurationWhichChangeSockets) runs once
    // automatically on every node mount/resolve — including right after a graph load — and
    // normalises the model (backfilling spec descriptions, resolving type-group types, restoring
    // spec defaults, normalising pointer slots, reordering keys via mergeValue/FlowSockets). Those
    // are reconciler-driven normalisations, not user edits, yet they legitimately change the model,
    // so a value-diff can't tell them apart from a real edit. Instead we suppress dirty-marking for
    // the duration of that automatic pass (see the reconcile useEffect below) and only mark the
    // graph dirty for setter calls triggered by genuine user actions.
    const suppressDirtyRef = useRef(false);
    const markDirtyIfChanged = () => {
        if (!suppressDirtyRef.current) {
            markGraphDirty();
        }
    };

    const setInputFlows = (next: Updater<Record<string, IInteractivityFlow>>) => {
        if (!node) { return; }
        node.flows = node.flows ?? {};
        const prev = node.flows.input ?? {};
        const resolved = applyUpdate(next, prev);
        node.flows.input = resolved;
        markDirtyIfChanged();
        forceRender();
    };
    const setOutputFlows = (next: Updater<Record<string, IInteractivityFlow>>) => {
        if (!node) { return; }
        node.flows = node.flows ?? {};
        const prev = node.flows.output ?? {};
        const resolved = applyUpdate(next, prev);
        node.flows.output = resolved;
        markDirtyIfChanged();
        forceRender();
    };
    const setInputValues = (next: Updater<Record<string, AuthoredValue>>) => {
        if (!node) { return; }
        node.values = node.values ?? {};
        const prev = node.values.input ?? {};
        const resolved = applyUpdate(next, prev);
        node.values.input = resolved;
        markDirtyIfChanged();
        forceRender();
    };
    const setOutputValues = (next: Updater<Record<string, AuthoredValue>>) => {
        if (!node) { return; }
        node.values = node.values ?? {};
        const prev = node.values.output ?? {};
        const resolved = applyUpdate(next, prev);
        node.values.output = resolved;
        // output socket types may have changed; recolor this node's outgoing wires to match
        props.data.recolorEdges?.(props.data.uid);
        markDirtyIfChanged();
        forceRender();
    };
    const setConfiguration = (next: Updater<Record<string, IInteractivityConfigurationValue>>) => {
        if (!node) { return; }
        const prev = node.configuration ?? {};
        const resolved = applyUpdate(next, prev);
        node.configuration = resolved;
        markDirtyIfChanged();
        forceRender();
    };

    useEffect(() => {
        const node: AuthoredNode = graph.nodes.find(node => node.uid === uid)!;
        setNode(node);
    }, [graph, uid]);

    // node just resolved/changed: run the reconciler once so configuration-driven sockets
    // (flow/switch cases, variable/set variables, ...) are materialised into the model. Reads come
    // straight from node now, so there is nothing to seed into local mirrors first.
    useEffect(() => {
        if (node) {
            // automatic normalisation pass — suppress dirty-marking so a fresh load (or any
            // model normalisation that isn't a user edit) doesn't spuriously prompt for a reload.
            // The setters run synchronously within this call, so the flag reliably brackets them.
            suppressDirtyRef.current = true;
            try {
                evaluateConfigurationWhichChangeSockets(node.configuration || {}, node.values?.input || {}, node.values?.output || {}, node.flows?.input || {}, node.flows?.output || {});
            } finally {
                suppressDirtyRef.current = false;
            }
        }
    }, [node]);

    // Adding/renaming flow sockets changes the Handle ids, but reactflow caches each node's
    // handle geometry. Refresh it so edges retargeted to the new socket id re-attach instead of
    // detaching (see the "Couldn't create edge for source handle id" note in AuthoringComponent).
    useEffect(() => {
        updateNodeInternals(uid);
    }, [uid, updateNodeInternals, Object.keys(inputFlows).join(","), Object.keys(outputFlows).join(",")]);

    const onChangeParameter = useCallback((evt: { target: { value: any; }; }) => {
        const socketId = (evt.target as HTMLInputElement).id.replace("in-", "");
        const curParam = inputValues[socketId];
        setInputValues({ ...inputValues, [socketId]: { value: castParameter(evt.target.value, standardTypes[curParam.type!]?.name ?? ""), typeOptions: curParam.typeOptions, type: curParam.type } });
    }, [inputValues]);

    // update a single component of a vector/matrix socket at the given flat value index,
    // leaving the other components untouched. Empty input is stored as NaN (unset).
    const onChangeComponent = useCallback((socket: string, index: number, raw: string) => {
        const curParam = inputValues[socket];
        if (!curParam) { return; }
        const arr = Array.isArray(curParam.value) ? [...curParam.value] : [];
        arr[index] = raw === "" ? NaN : Number(raw);
        setInputValues({ ...inputValues, [socket]: { value: arr, typeOptions: curParam.typeOptions, type: curParam.type } });
    }, [inputValues]);

    // set a bool socket's static value from the TRUE/FALSE switch
    const onChangeBoolean = useCallback((socket: string, checked: boolean) => {
        const curParam = inputValues[socket];
        if (!curParam) { return; }
        setInputValues({ ...inputValues, [socket]: { value: [checked], typeOptions: curParam.typeOptions, type: curParam.type } });
    }, [inputValues]);

    // apply an easing preset to an interpolate node: set both p1 and p2 float2 control-point
    // sockets at once. The per-component number inputs remain available for fine tuning.
    const setInterpolationControlPoints = useCallback((p1: ControlPoint, p2: ControlPoint) => {
        setInputValues((prev) => ({
            ...prev,
            p1: { typeOptions: prev.p1?.typeOptions ?? [3], type: prev.p1?.type ?? 3, value: p1 },
            p2: { typeOptions: prev.p2?.typeOptions ?? [3], type: prev.p2?.type ?? 3, value: p2 },
        }));
    }, []);

    // set a ref socket's static value (a JSON pointer string) from the picker or manual entry
    const setSocketRefValue = useCallback((socket: string, pointer: string) => {
        const curParam = inputValues[socket];
        if (!curParam) { return; }
        setInputValues({ ...inputValues, [socket]: { value: castParameter(pointer, standardTypes[curParam.type!]?.name ?? ""), typeOptions: curParam.typeOptions, type: curParam.type } });
    }, [inputValues]);

    const onChangeType = useCallback((evt: { target: { value: any; }; }) => {
        const socketId = (evt.target as HTMLInputElement).id.replace("typeDropDown-", "");
        const curParam = inputValues[socketId];
        const newType = Number(evt.target.value);
        const newParam: AuthoredValue = { ...curParam, value: [undefined], type: newType };
        const group = curParam.typeGroup ?? nodeSpec?.values?.input?.[socketId]?.typeGroup;

        if (group === undefined) {
            setInputValues({ ...inputValues, [socketId]: newParam });
            return;
        }

        // grouped socket: propagate the newly picked type to every unconnected sibling in the
        // group — plus the output — so the whole node (e.g. math/add's a, b, value) stays one
        // consistent type. Every unconnected sibling adopts the new type and has its static value
        // cleared, INCLUDING a sibling that currently holds a static value: the explicit dropdown
        // choice must win over such a value.
        // A wired sibling is left untouched — never force-updated or disconnected just because
        // another socket's dropdown was touched (that could be an accidental click). Its source
        // connection keeps dictating its own type; resolveTypeGroupType treats an unconnected
        // member's selected type as ground truth for the group regardless, so any resulting
        // mismatch is only ever surfaced as a warning (see getGroupTypeConflict), never resolved by
        // touching the wire.
        const nextInputValues = { ...inputValues };
        for (const [s, v] of Object.entries(inputValues)) {
            if (s === socketId) { nextInputValues[s] = newParam; continue; }
            if ((v.typeGroup ?? nodeSpec?.values?.input?.[s]?.typeGroup) !== group) { continue; }
            if (isSocketLinked(s)) { continue; }
            nextInputValues[s] = { ...v, value: [undefined], type: newType };
        }
        setInputValues(nextInputValues);

        const groupOutputEntries = Object.entries(outputValues).filter(
            ([s, v]) => (v.typeGroup ?? nodeSpec?.values?.output?.[s]?.typeGroup) === group
        );
        if (groupOutputEntries.length > 0) {
            const nextOutputValues = { ...outputValues };
            for (const [s, v] of groupOutputEntries) {
                nextOutputValues[s] = { ...v, value: [undefined], type: newType };
            }
            setOutputValues(nextOutputValues);
        }
    }, [inputValues, outputValues, node]);

    // shared handler for the `event`/`variable`/`type` selects and the generic fallback text
    // input: casts the raw string from evt.target.value according to the config's declared type
    // (they're all INT indices, except the plain-text fallback which can also be STRING/untyped).
    const onChangeConfiguration = useCallback((evt: { target: { value: any; }; }) => {
        const configurationId = (evt.target as HTMLInputElement).id;
        const configSpec = nodeSpec?.configuration?.[configurationId];
        const rawValue = evt.target.value;
        const value = configSpec?.type === InteractivityConfigurationValueType.INT ? Number(rawValue) : rawValue;
        const newConfiguration = { ...configuration, [configurationId]: { value: [value] } };
        setConfiguration(newConfiguration);
        evaluateConfigurationWhichChangeSockets(newConfiguration, inputValues, outputValues, inputFlows, outputFlows);
    }, [configuration, inputValues, outputValues, inputFlows, outputFlows, node]);

    // Handle the pointer config combobox: set the pointer template and, on a catalogue selection,
    // auto-select the matching data type. Free-text edits pass no type and only update the pointer.
    const onChangePointer = useCallback((template: string, typeSignature?: InteractivityValueType) => {
        const newConfiguration: Record<string, IInteractivityConfigurationValue> = {
            ...configuration,
            pointer: { value: [template] },
        };
        if (typeSignature !== undefined && configuration.type !== undefined) {
            const typeIndex = getStandardTypeIndexForSignature(typeSignature);
            if (typeIndex !== -1) {
                newConfiguration.type = { value: [typeIndex] };
            }
        }
        setConfiguration(newConfiguration);
        evaluateConfigurationWhichChangeSockets(newConfiguration, inputValues, outputValues, inputFlows, outputFlows);
    }, [configuration, inputValues, outputValues, inputFlows, outputFlows]);

    // nodeIndex config (event/onSelect, event/onHoverIn/Out, rigid_body triggers, ...): store the
    // picked glTF node index. Also settable via free-text entry, so accepts a raw number.
    const onChangeNodeIndex = useCallback((index: number) => {
        const newConfiguration: Record<string, IInteractivityConfigurationValue> = {
            ...configuration,
            nodeIndex: { value: [index] },
        };
        setConfiguration(newConfiguration);
        evaluateConfigurationWhichChangeSockets(newConfiguration, inputValues, outputValues, inputFlows, outputFlows);
    }, [configuration, inputValues, outputValues, inputFlows, outputFlows]);

    // multi-variable config (variable/set): store the selection as a plain array of variable ids
    // and re-evaluate so each selected variable gets its input value socket.
    const onChangeVariables = useCallback((ids: number[]) => {
        const newConfiguration: Record<string, IInteractivityConfigurationValue> = {
            ...configuration,
            variables: { value: ids },
        };
        setConfiguration(newConfiguration);
        evaluateConfigurationWhichChangeSockets(newConfiguration, inputValues, outputValues, inputFlows, outputFlows);
    }, [configuration, inputValues, outputValues, inputFlows, outputFlows]);

    // generic typed config field (bool/int/string, no special socket-picking UI): store the
    // already-parsed value under its configuration id and re-evaluate in case it affects sockets
    // (e.g. flow/waitAll's `inputFlows`).
    const onChangeGenericConfig = useCallback((configurationId: string, value: any) => {
        const newConfiguration: Record<string, IInteractivityConfigurationValue> = {
            ...configuration,
            [configurationId]: { value: [value] },
        };
        setConfiguration(newConfiguration);
        evaluateConfigurationWhichChangeSockets(newConfiguration, inputValues, outputValues, inputFlows, outputFlows);
    }, [configuration, inputValues, outputValues, inputFlows, outputFlows]);

    // int[] config (e.g. `cases`): stores the full list of integers directly, matching the
    // KHR_interactivity value format (one array entry per case), unlike the other generic
    // configs above which wrap a single value in a 1-element array.
    const onChangeIntArrayConfig = useCallback((configurationId: string, values: number[]) => {
        const newConfiguration: Record<string, IInteractivityConfigurationValue> = {
            ...configuration,
            [configurationId]: { value: values },
        };
        setConfiguration(newConfiguration);
        evaluateConfigurationWhichChangeSockets(newConfiguration, inputValues, outputValues, inputFlows, outputFlows);
    }, [configuration, inputValues, outputValues, inputFlows, outputFlows]);

    const evaluateConfigurationWhichChangeSockets = useCallback((updatedConfiguration: Record<string, IInteractivityConfigurationValue>,
        inputValues: Record<string, AuthoredValue>,
        outputValues: Record<string, AuthoredValue>,
        inputFlows: Record<string, IInteractivityFlow>,
        outputFlows: Record<string, IInteractivityFlow>) => {
        const nodeType = node?.op;
        const nodeSpec: AuthoredNode | undefined = interactivityNodeSpecs.find(node => node.op === nodeType);

        // ops with a fixed (non-configuration-driven) socket set fully rely on the spec/config-key
        // lists below to decide what still exists; ops carrying this flag instead own their current
        // socket set entirely via the configuration re-evaluation above (e.g. flow/switch's cases,
        // variable/set's selected variables), so a key that configuration no longer generates is
        // meant to disappear.
        const allowsDynamicSockets = props.data.isNoOp === true || hasNodeSpecFlag(nodeSpec, NodeSpecFlag.DynamicSockets);

        const generated = computeConfigDrivenSockets(updatedConfiguration, inputValues, {
            nodeType,
            events: props.data.events,
            variables: graph.variables,
        });

        // We only want to set socket values that are either in the node's spec or are created as a
        // result of the configuration. If the current node has a value for a socket we should use
        // it, otherwise we will use the node spec default (if it exists); remaining sockets would
        // have been populated by computeConfigDrivenSockets above.
        const inputValuesToSet = mergeValueSockets({
            existing: inputValues,
            generated: generated.inputValues,
            specDefaults: nodeSpec?.values?.input || {},
            // a socket name this fixed-spec op doesn't declare (a typo, or a hand-edited/broken
            // glTF) would otherwise be silently dropped here on every re-evaluation; keep it around
            // as long as it still carries real data so the node UI can flag it instead of hiding
            // the invalid state
            extraKeys: allowsDynamicSockets ? [] : Object.keys(inputValues),
            preservedKeys: generated.preservedPointerSlotIds,
            pointerSlotTypeById: generated.pointerSlotTypeById,
            allowExistingToOverrideGenerated: true,
        });

        const outputValuesToSet = mergeValueSockets({
            existing: outputValues,
            generated: generated.outputValues,
            specDefaults: nodeSpec?.values?.output || {},
            extraKeys: [],
            allowExistingToOverrideGenerated: false,
        });

        const inputFlowsToSet = mergeFlowSockets({
            existing: inputFlows,
            generated: generated.inputFlows,
            specDefaults: nodeSpec?.flows?.input || {},
        });

        let outputFlowsToSet = mergeFlowSockets({
            existing: outputFlows,
            generated: generated.outputFlows,
            specDefaults: nodeSpec?.flows?.output || {},
            // same reasoning as inputValuesToSet's extraKeys above, for an unknown output flow socket name
            extraKeys: allowsDynamicSockets ? [] : Object.keys(outputFlows),
        });
        if (hasNodeSpecFlag(nodeSpec, NodeSpecFlag.DynamicFlowOutputs)) {
            // flow sequence is a very special node which has sockets that are not in the node spec nor generated based on configuration
            outputFlowsToSet = { ...outputFlowsToSet, ...outputFlows };
        }

        setOutputFlows(outputFlowsToSet);
        setInputFlows(inputFlowsToSet);
        setInputValues(inputValuesToSet);
        setOutputValues(outputValuesToSet);
    }, [inputValues, outputValues, inputFlows, outputFlows, node, configuration, graph.variables, props.data.events, props.data.isNoOp])

    const stringToListOfNumbers = (inputString: string) => {
        const numberStrings = inputString.split(',');
        return numberStrings.map(numberString => parseFloat(numberString));
    }

    const castParameter = (value: any, signature: string) => {
        switch (signature) {
            case "bool":
                return typeof value === "string" ? [value === "true"] : [JSON.parse(value)];
            case "int":
            case "float":
                return [Number(value)];
            case "float2":
            case "float3":
            case "float4":
            case "float4x4":
                return typeof value === "string" ? stringToListOfNumbers(value) : value
            case "ref":
                // ref values are JSON pointer strings, but must be array-wrapped like every other
                // type (AuthoredValue.value: any[]) so the runtime's parseType/resolveRef —
                // which read val[0] — and the spec-shaped export both see "/nodes/0", not "/".
                return [value === "" || value == null ? undefined : String(value)]
            case "AMZN_interactivity_string":
                return String(value)
            default:
                return String(value)
        }
    }

    // immutable spec for this node — the source of truth for typeGroup membership (a wired socket's
    // live object loses its typeGroup tag when overwritten by the connection link)
    const nodeSpec = interactivityNodeSpecs.find(n => n.op === node?.op);

    // Resolve the concrete type shared by every socket tagged with `group` on this node instance.
    // Delegates to the shared resolver, fed this node's freshest values (local state), so the
    // priority (static value > connection > default) and spec-based membership stay consistent with
    // the connect/disconnect side in AuthoringComponent. Mirrors the KHR_interactivity rule that
    // sockets sharing a type variable (e.g. floatN's `T`) resolve to the same concrete type.
    const getGroupType = (group: string): number | undefined =>
        resolveTypeGroupType(
            { declaration: -1, op: node?.op, values: { input: inputValues, output: outputValues } },
            nodeSpec,
            group,
            graph.nodes,
        );

    // Detect a wired input socket whose connected source outputs a type this socket doesn't
    // declare as acceptable (its spec `typeOptions` — the same set `hasIntersection` checks
    // against at connect time in AuthoringComponent). This can drift out of sync with the wire
    // after the initial connection: connecting to a "configurable" socket (variable/set,
    // event/send, pointer/get, ...) skips that check entirely, and a source's output type can
    // change later (type dropdown, typeGroup resolution) without re-validating existing wires.
    const getInputTypeMismatch = (socket: string, value: AuthoredValue, resolvedType: number | undefined): string | undefined => {
        const link = node?.values?.input?.[socket] ?? value;
        if (link?.node === undefined || resolvedType === undefined) { return undefined; }
        const expectedTypeOptions = nodeSpec?.values?.input?.[socket]?.typeOptions ?? value.typeOptions;
        if (expectedTypeOptions === undefined || expectedTypeOptions.includes(resolvedType)) { return undefined; }
        const expectedLabel = expectedTypeOptions.map((t) => getTypeLabel(t)).join(" | ");
        return `Type mismatch on socket "${getInputSocketFullLabel(socket)}": wired value is ${getTypeLabel(resolvedType)}, but this socket expects ${expectedLabel}`;
    };

    // A wired socket's badge/handle should reflect the connected value's type only when that type
    // is actually one the socket declares as acceptable — otherwise (a mismatch caught by
    // getInputTypeMismatch) showing the foreign type as if it were adopted is misleading, so fall
    // back to displaying the socket's own declared type instead.
    const getDisplaySocketType = (socket: string, value: AuthoredValue, resolvedType: number | undefined): number | undefined => {
        if (resolvedType === undefined) { return resolvedType; }
        const expectedTypeOptions = nodeSpec?.values?.input?.[socket]?.typeOptions ?? value.typeOptions;
        if (expectedTypeOptions === undefined || expectedTypeOptions.includes(resolvedType)) { return resolvedType; }
        return value.type ?? expectedTypeOptions[0];
    };

    // A socket's own effective type, ignoring the group's collapsed resolution: a wire's source
    // type if wired, otherwise the socket's own stored `type` (whatever the type dropdown last set
    // it to). Needed because resolveSocketType folds every unwired grouped socket into ONE shared
    // answer (resolveTypeGroupType picks a single winner for the whole group), so comparing via
    // resolveSocketType can never see two differing unwired members, and — since that winner
    // requires an actual static *value* to be present, not just a type — it also ignores a type the
    // user just picked from the dropdown until a value is entered, making the group-conflict check
    // silently stale right after a manual type change.
    const getOwnSocketType = (socket: string, value: AuthoredValue): number | undefined => {
        const link = node?.values?.input?.[socket] ?? value;
        if (link?.node !== undefined) {
            const sourceNode = graph.nodes.find(n => n.uid === link.node);
            // Resolve the source's output the same way its outgoing wire is colored
            // (resolveOutputSocketType in getAuthorGraph) — group-aware — instead of reading the raw
            // stored `.type`. A grouped source (e.g. a math node whose group resolved to float via a
            // sibling) can have a stale spec-default `int` on its stored output socket while its wire
            // is correctly float; reading the raw type here made this input's badge read int and
            // triggered a false type-group conflict against a float sibling. Going through the same
            // resolver keeps the badge and the wire in lockstep.
            return resolveOutputSocketType(sourceNode, link.socket!, graph.nodes);
        }
        return value?.type;
    };

    // Detect an input socket whose own type disagrees with a sibling in the same typeGroup — e.g.
    // math/add's `a` and `b` share a group (both must be the same concrete type), so wiring an int
    // into `a` and a float into `b` is invalid even though each individually satisfies its own
    // typeOptions, and so is picking `b`'s type dropdown to float while `a` is wired to int.
    // Membership is read from the immutable spec since a wired socket's live object loses its
    // `typeGroup` tag (see getTypeGroupMembers). Every member that disagrees with at least one
    // sibling is flagged, since there's no way to tell which one is "correct".
    const getGroupTypeConflict = (socket: string, value: AuthoredValue): string | undefined => {
        const group = value.typeGroup ?? nodeSpec?.values?.input?.[socket]?.typeGroup;
        if (group === undefined) { return undefined; }
        const ownType = getOwnSocketType(socket, value);
        if (ownType === undefined) { return undefined; }
        const { inputs } = getTypeGroupMembers(nodeSpec, group);
        const conflicting: string[] = [];
        for (const name of inputs) {
            if (name === socket) { continue; }
            const siblingValue = inputValues[name];
            if (siblingValue === undefined) { continue; }
            const siblingType = getOwnSocketType(name, siblingValue);
            if (siblingType !== undefined && siblingType !== ownType) {
                conflicting.push(`${name}: ${getTypeLabel(siblingType)}`);
            }
        }
        if (conflicting.length === 0) { return undefined; }
        return `Type group mismatch on socket "${getInputSocketFullLabel(socket)}": this socket is ${getTypeLabel(ownType)}, but a sibling socket sharing the same type must match (${conflicting.join(", ")})`;
    };

    // KHR_interactivity requires every input socket to either be wired or carry a static value —
    // an unconnected socket left at its "no value entered yet" placeholder (undefined/NaN/empty
    // string, depending on the socket's shape) would export as invalid.
    const getMissingValueWarning = (socket: string, value: AuthoredValue): string | undefined => {
        if (isSocketLinked(socket)) { return undefined; }
        // ref sockets store their pointer array-wrapped (see castParameter), but older graphs may
        // still carry a bare string; normalize both shapes before checking.
        const raw = value.value;
        const values = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
        const isUnset = values.length === 0 ||
            values.every((v) => v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v)));
        if (!isUnset) { return undefined; }
        return `Missing value on socket "${getInputSocketFullLabel(socket)}": not connected and has no value set`;
    };

    // Determine the effective type of an input socket. A wired socket takes its type from the
    // connected source output socket (auto-detected), so its own type/typeOptions are ignored.
    // The connection lives on the shared graph model (mutated on connect), which may be ahead of
    // this node's local `value` state. Otherwise, a grouped socket adopts its group's resolved
    // type (so ungrouped-but-linked siblings stay visually consistent); finally fall back to the
    // socket's own type.
    const resolveSocketType = (socket: string, value: AuthoredValue): number | undefined => {
        const link = node?.values?.input?.[socket] ?? value;
        if (link?.node !== undefined) {
            const sourceNode = graph.nodes.find(n => n.uid === link.node);
            // group-aware resolution of the source output (matches the wire color) — see getOwnSocketType
            const sourceType = resolveOutputSocketType(sourceNode, link.socket!, graph.nodes);
            if (sourceType !== undefined) {
                return sourceType;
            }
        }
        const group = value.typeGroup ?? nodeSpec?.values?.input?.[socket]?.typeGroup;
        if (group !== undefined) {
            const groupType = getGroupType(group);
            if (groupType !== undefined) { return groupType; }
        }
        return value?.type;
    }

    // parse the currently-selected variable ids for the multi-variable config (variable/set).
    // The stored value may be a plain number array (["0", "1"] / [0, 1]) or, from legacy text
    // entry, a single comma/bracket-delimited string in value[0]; normalise both to number[].
    const getSelectedVariableIds = (): number[] => {
        const raw = configuration.variables?.value;
        if (!Array.isArray(raw)) { return []; }
        let source: any[] = raw;
        if (typeof raw[0] === "string" && (raw[0].includes(",") || raw[0].includes("["))) {
            const cleaned = raw[0].replace(/[[\]\s]/g, "");
            source = cleaned === "" ? [] : cleaned.split(",");
        }
        return source
            .filter((id) => id != null)
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id >= 0);
    };

    // variable/set keys its input value sockets by the numeric variable id (see
    // updatedConfiguration.variables handling above); show the variable's name instead so the
    // sockets stay identifiable without cross-referencing the "variables" config chips.
    const isVariableSetNode = node?.op === "variable/set";
    const MAX_SOCKET_LABEL_LENGTH = 30;
    const getInputSocketFullLabel = (socket: string): string => {
        if (isVariableSetNode) {
            const variable = graph.variables[Number(socket)] as (IInteractivityVariable & { id?: string }) | undefined;
            const name = variable?.name ?? variable?.id;
            if (name) { return name; }
        }
        return socket;
    };
    const getInputSocketLabel = (socket: string): string => {
        const label = getInputSocketFullLabel(socket);
        return label.length > MAX_SOCKET_LABEL_LENGTH ? `${label.slice(0, MAX_SOCKET_LABEL_LENGTH - 1)}…` : label;
    };

    const isPointerNode = node?.op?.startsWith("pointer/") ?? false;
    // flow/sequence and flow/multiGate have user-managed, renamable output flow sockets
    const isDynamicFlowNode = hasNodeSpecFlag(nodeSpec, NodeSpecFlag.DynamicFlowOutputs);

    // a socket name this op's spec doesn't declare, on an op with a fixed (non-configuration-driven)
    // socket set - mirrors loadGraphFromJson's per-node spec-validity check (the same diagnostic
    // shown in this node's header warning tooltip), so the exact socket a typo or hand-edited/broken
    // glTF put here is visible and editable rather than silently missing from the node body
    const isNoOp = props.data.isNoOp === true;
    const allowsDynamicSockets = isNoOp || hasNodeSpecFlag(nodeSpec, NodeSpecFlag.DynamicSockets);
    const isUnknownInputValueSocket = (socket: string): boolean =>
        !isNoOp && !allowsDynamicSockets && nodeSpec?.values?.input?.[socket] === undefined;
    const isUnknownOutputFlowSocket = (socket: string): boolean =>
        !isNoOp && !allowsDynamicSockets && nodeSpec?.flows?.output?.[socket] === undefined;

    // interpolate nodes expose p1/p2 as the cubic-bezier easing control points; show a curve
    // preview + preset picker when both are present as inline (unwired) float2 values.
    const isInterpolateNode = node?.op === "variable/interpolate" || node?.op === "pointer/interpolate";
    const isSocketLinked = (socket: string) =>
        (props.data.linked && props.data.linked[socket]) || node?.values?.input?.[socket]?.node !== undefined;
    const readControlPoint = (socket: string): ControlPoint => {
        const v = inputValues[socket]?.value;
        return [Number(v?.[0]), Number(v?.[1])];
    };
    const showInterpolationCurve =
        isInterpolateNode &&
        inputValues.p1 !== undefined && inputValues.p2 !== undefined &&
        !isSocketLinked("p1") && !isSocketLinked("p2");

    // the custom event a event/send or event/receive node is currently configured to use (if any).
    // configuration.event holds the selected index into the graph's events list (-1 / undefined = none)
    const configuredEventIndex = configuration.event?.value?.[0];
    const configuredEvent: IInteractivityEvent | undefined =
        configuredEventIndex != null && Number(configuredEventIndex) >= 0
            ? props.data.events?.[Number(configuredEventIndex)]
            : undefined;

    // add a new output flow socket with a unique numeric name
    const addOutputFlow = () => {
        const keys = new Set(Object.keys(outputFlows));
        let i = keys.size;
        while (keys.has(String(i))) { i++; }
        setOutputFlows({ ...outputFlows, [String(i)]: { node: undefined, socket: undefined } });
    };

    // rename an output flow socket. Sockets execute in sorted order (KHR_interactivity spec 4.1.4.1.1),
    // so the rename directly controls sequencing. Keeps the graph model and any wiring in sync.
    const renameOutputFlow = (oldName: string, rawNewName: string) => {
        const newName = rawNewName.trim();
        if (newName === "" || newName === oldName || outputFlows[newName] !== undefined) {
            return;
        }
        const updated: Record<string, IInteractivityFlow> = {};
        for (const [key, value] of Object.entries(outputFlows)) {
            updated[key === oldName ? newName : key] = value;
        }
        setOutputFlows(updated);
        if (node?.flows?.output && node.flows.output[oldName] !== undefined) {
            node.flows.output[newName] = node.flows.output[oldName];
            delete node.flows.output[oldName];
        }
        props.data.renameFlowSocket?.(props.data.uid, oldName, newName);
    };

    // this node's position in the graph's node list — the index used by KHR_interactivity
    // node references (e.g. configuration.nodeIndex) elsewhere in the graph
    const nodeIndex = graph.nodes.findIndex((n) => n.uid === uid);

    // NodeIndex that a given uid resolves to, for annotating a wired socket's tooltip row with
    // what it's connected to.
    const nodeIndexForUid = (targetUid: string | number | undefined): number | undefined => {
        if (targetUid === undefined) { return undefined; }
        const idx = graph.nodes.findIndex((n) => n.uid === targetUid);
        return idx >= 0 ? idx : undefined;
    };

    // reverse-lookup: every node whose flows.output points at (this node's uid, socket) — i.e.
    // every upstream node flowing into this input flow socket. flows.input is never populated
    // with the link itself (only used as template metadata, e.g. flow/waitAll's inputFlows
    // count — see setInputFlows above), so the only way to find the source(s) is to scan for
    // whoever points here.
    const findFlowSourceIndices = (socket: string): number[] =>
        graph.nodes
            .map((n, i) => (Object.values(n.flows?.output ?? {}).some((f) => f.node === uid && f.socket === socket) ? i : undefined))
            .filter((i): i is number => i !== undefined);

    // reverse-lookup: every node whose values.input references (this node's uid, socket) — a
    // value output can fan out to several consumers, unlike a value input which has one source.
    const findValueConsumerIndices = (socket: string): number[] =>
        graph.nodes
            .map((n, i) => (Object.values(n.values?.input ?? {}).some((v) => v.node === uid && v.socket === socket) ? i : undefined))
            .filter((i): i is number => i !== undefined);

    // load-time spec-validity diagnostics attributed to this node instance (unknown socket names /
    // socket type mismatches against this op's declaration in nodes.ts - see loadGraphFromJson)
    const specDiagnosticLines = diagnostics
        .filter((d) => d.category === "node" && d.nodeUid === uid)
        .map((d) => d.title);

    // this node instance's own live socket warnings (missing values, type mismatches, type-group
    // conflicts) - recomputed every render as the user edits, unlike specDiagnosticLines which are
    // fixed at load time
    const liveWarningLines = Object.entries(inputValues)
        .map(([socket, value]) => {
            const resolvedType = resolveSocketType(socket, value);
            return getInputTypeMismatch(socket, value, resolvedType) ?? getGroupTypeConflict(socket, value) ?? getMissingValueWarning(socket, value);
        })
        .filter((msg): msg is string => msg !== undefined);

    // aggregate socket-level mismatches into a single node-header warning, so a type conflict on
    // any input is visible without having to scan every socket
    const typeMismatchLines = [...specDiagnosticLines, ...liveWarningLines];

    // report this node's live warnings up to the shared context so the top-level DiagnosticsPanel
    // and DiagnosticsCounter reflect problems introduced by editing the graph, not just ones found
    // when a file is loaded. specDiagnosticLines are already load-time context diagnostics and
    // must not be re-reported here, or they'd be duplicated in the combined list.
    const liveWarningLinesKey = liveWarningLines.join("\n");
    useEffect(() => {
        reportNodeWarnings(uid, nodeIndex, node?.op, liveWarningLinesKey === "" ? [] : liveWarningLinesKey.split("\n"));
    }, [uid, nodeIndex, node?.op, liveWarningLinesKey, reportNodeWarnings]);

    // clear this node's reported warnings only on true unmount (node deleted/type changed) - not
    // on every warning-content change above, which would otherwise clear-then-reinstate on every
    // edit and undo the "bail out if unchanged" dedup in reportNodeWarnings (see its definition),
    // doubling re-renders on every warning change instead of skipping them when nothing moved.
    useEffect(() => {
        return () => reportNodeWarnings(uid, nodeIndex, node?.op, []);
    }, [uid]);

    const headerTooltipSections: NodeTooltipSections = {
        nodeIndex,
        description: node?.description,
        warnings: typeMismatchLines,
        flowIn: Object.keys(inputFlows).map((socket) => ({
            socket,
            connectedNodeIndices: findFlowSourceIndices(socket),
        })),
        flowOut: Object.keys(outputFlows).map((socket) => {
            const targetIndex = nodeIndexForUid((node?.flows?.output?.[socket] ?? outputFlows[socket])?.node);
            return { socket, connectedNodeIndices: targetIndex !== undefined ? [targetIndex] : [] };
        }),
        valueIn: Object.entries(inputValues).map(([socket, value]) => {
            const sourceIndex = nodeIndexForUid((node?.values?.input?.[socket] ?? value)?.node);
            return { socket, description: value.description, connectedNodeIndices: sourceIndex !== undefined ? [sourceIndex] : [] };
        }),
        valueOut: Object.entries(outputValues).map(([socket, value]) => ({
            socket,
            description: value.description,
            connectedNodeIndices: findValueConsumerIndices(socket),
        })),
    };

    const headerContent = (
        <div className={"flow-node-header"} style={{ background: getNodeCategoryColor(node?.op || "") }}>
            <RenderIf shouldShow={typeMismatchLines.length > 0}>
                <span className={"flow-node-header-warning"}>⚠</span>
            </RenderIf>
            <h2>
                {node?.op}
            </h2>
            <button
                type="button"
                className={"flow-node-delete-btn nodrag nopan"}
                title={"Delete node"}
                onClick={(e) => { e.stopPropagation(); deleteElements({ nodes: [{ id: uid }] }); }}
            >
                ×
            </button>
        </div>
    );

    return (
        <div className={`flow-node${isPointerNode ? " flow-node--pointer" : ""}${typeMismatchLines.length > 0 ? " flow-node--warning" : ""}`}>
            {/* while the node is being dragged, skip OverlayTrigger entirely so the tooltip can't
                stay open/reopen mid-drag (hover never "leaves" the header just because the mouse
                stayed still relative to it while the node moved underneath) */}
            <RenderIf shouldShow={!props.dragging}>
                <OverlayTrigger
                    placement="bottom"
                    delay={{ show: 300, hide: 0 }}
                    overlay={
                        <Tooltip id={`node-header-tooltip-${uid}`} className="node-info-tooltip">
                            <NodeInfoTooltip sections={headerTooltipSections} />
                        </Tooltip>
                    }
                >
                    {headerContent}
                </OverlayTrigger>
            </RenderIf>
            <RenderIf shouldShow={!!props.dragging}>
                {headerContent}
            </RenderIf>

            <div className={"flow-node-body"}>
                <RenderIf shouldShow={Object.keys(configuration).length > 0}>
                    {/* configuration */}
                    <div className={"flow-node-config"}>
                        {
                            (configuration.event !== undefined) &&
                            <div className={"flow-node-field"}>
                                <label htmlFor="event">event</label>
                                <select id="event" name="event" className="nodrag" defaultValue={configuration.event.value?.[0] === undefined ? -1 : configuration.event.value[0]} onChange={(event) => {
                                    if (Number(event.target.value) === -1) {
                                        return
                                    }
                                    onChangeConfiguration(event)
                                }} >
                                    <option key={-1} value={-1}>--NO SELECTION--</option>
                                    {
                                        props.data.events.map((ce: any, index: number) => (
                                            <option key={index} value={index}>{ce.id}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        }
                        {
                            (configuration.variable !== undefined) &&
                            <div className={"flow-node-field"}>
                                <label htmlFor="variable">variable</label>
                                <select id="variable" name="variable" className="nodrag" defaultValue={configuration.variable.value?.[0] === undefined ? -1 : configuration.variable.value[0]} onChange={(event) => {
                                    if (Number(event.target.value) === -1) {
                                        return
                                    }
                                    onChangeConfiguration(event)
                                }}>
                                    <option key={-1} value={-1}>--NO SELECTION--</option>
                                    {

                                        graph.variables.map((v: any, index: number) => {
                                            const name = v.name ?? v.id;
                                            const label = name ? `${name} (#${index})` : `variable #${index}`;
                                            return (
                                                <option key={index} value={index}>{`${label} — ${getTypeLabel(v.type)}`}</option>
                                            );
                                        })
                                    }
                                </select>
                            </div>
                        }
                        {
                            (configuration.variables !== undefined) &&
                            <div className={"flow-node-field"}>
                                <label htmlFor="variables">variables</label>
                                <VariablesConfigField
                                    variables={graph.variables}
                                    selectedIds={getSelectedVariableIds()}
                                    onChange={onChangeVariables}
                                />
                            </div>
                        }
                        {
                            (configuration.pointer !== undefined) &&
                            <div className={"flow-node-field"}>
                                <label htmlFor="pointer">pointer</label>
                                <PointerConfigField
                                    value={String(configuration.pointer.value?.[0] ?? "")}
                                    allowReadOnly={node?.op === "pointer/get"}
                                    onChange={onChangePointer}
                                />
                            </div>
                        }
                        {
                            (configuration.nodeIndex !== undefined) &&
                            (() => {
                                const selectedNodeName = gltfObjectModel?.nodes.find((n) => n.index === configuration.nodeIndex.value?.[0])?.name;
                                return (
                                    <div className={"flow-node-field"}>
                                        <label htmlFor="nodeIndex">nodeIndex</label>
                                        <div style={{ display: "flex", gap: 4 }}>
                                            <input
                                                id="nodeIndex"
                                                name="nodeIndex"
                                                type="number"
                                                className={"flow-node-control nodrag"}
                                                style={{ flex: 1, minWidth: 0 }}
                                                value={String(configuration.nodeIndex.value?.[0] ?? -1)}
                                                onChange={(event) => onChangeNodeIndex(Number(event.target.value))}
                                            />
                                            <button type="button" onClick={() => setShowNodeIndexPicker(true)} style={refSelectButtonStyle} title={"Select a node"}>
                                                Select…
                                            </button>
                                        </div>
                                        {
                                            selectedNodeName &&
                                            <div className={"flow-node-hint"} title={selectedNodeName}>
                                                {selectedNodeName}
                                            </div>
                                        }
                                    </div>
                                );
                            })()
                        }
                        {
                            (configuration.type !== undefined) &&
                            <div className={"flow-node-field"}>
                                <label htmlFor="type">{isPointerNode ? "Pointer Type" : "type"}</label>
                                <select id="type" name="type" className="nodrag" key={`type-${configuration.type.value?.[0]}`} defaultValue={configuration.type.value?.[0] === undefined ? -1 : configuration.type.value[0]} onChange={(event) => {
                                    if (Number(event.target.value) === -1) {
                                        return
                                    }

                                    onChangeConfiguration(event)
                                }}>
                                    <option key={-1} value={-1}>--NO SELECTION--</option>
                                    {

                                        props.data.types.map((t: any, index: number) => (
                                            <option key={index} value={index}>{t.name || t.signature}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        }
                        {
                            Object.keys(configuration)
                                .filter((configurationId) => configurationId !== "event" && configurationId !== "variable" && configurationId !== "variables" && configurationId !== "type" && configurationId !== "pointer" && configurationId !== "nodeIndex")
                                .map((configurationId) => {
                                    const configSpec = nodeSpec?.configuration?.[configurationId];
                                    const configValue = configuration[configurationId];
                                    return (
                                        <div key={configurationId} className={"flow-node-field"}>
                                            <label htmlFor={configurationId} title={configSpec?.description}>{configurationId}</label>
                                            {
                                                configSpec?.type === InteractivityConfigurationValueType.BOOLEAN ? (
                                                    <BoolSwitch
                                                        checked={Boolean(configValue.value?.[0])}
                                                        onChange={(checked) => onChangeGenericConfig(configurationId, checked)}
                                                    />
                                                ) : configSpec?.type === InteractivityConfigurationValueType.INT ? (
                                                    <input
                                                        id={configurationId}
                                                        name={configurationId}
                                                        type="number"
                                                        step={1}
                                                        className={"flow-node-control nodrag"}
                                                        value={configValue.value?.[0] ?? ""}
                                                        onChange={(e) => onChangeGenericConfig(configurationId, e.target.value === "" ? undefined : parseInt(e.target.value, 10))}
                                                    />
                                                ) : configSpec?.type === InteractivityConfigurationValueType.INT_ARR ? (
                                                    <IntArrayConfigField
                                                        values={parseIntArrayConfigValue(configValue.value)}
                                                        onChange={(values) => onChangeIntArrayConfig(configurationId, values)}
                                                    />
                                                ) : (
                                                    <input
                                                        id={configurationId}
                                                        name={configurationId}
                                                        className={"flow-node-control nodrag"}
                                                        defaultValue={configValue.value}
                                                        onChange={onChangeConfiguration}
                                                    />
                                                )
                                            }
                                        </div>
                                    )
                                })
                        }
                    </div>
                </RenderIf>

                <RenderIf shouldShow={Object.keys(inputFlows).length > 0 || Object.keys(outputFlows).length > 0}>
                    <hr />
                    {/*flows*/}
                    <div className={"flow-node-row"}>
                        {/*inputFlows*/}
                        <div>
                            {Object.keys(inputFlows).map(socket => {
                                return (
                                    <div key={socket} className={"flow-node-socket"}>
                                        <div className={"flow-node-socket-head"}>
                                            <span className={"flow-node-type-badge"} style={{ background: FLOW_COLOR }}>flow</span>
                                            <label htmlFor={socket}>{socket}</label>
                                        </div>
                                        <Handle type="target" position={Position.Left} id={socket} style={handleStyle(FLOW_COLOR, "left")} />
                                    </div>
                                )
                            })}
                        </div>

                        {/*outputFlows*/}
                        <div className={"flow-node-outputs"}>
                            {(isDynamicFlowNode ? Object.keys(outputFlows).sort() : Object.keys(outputFlows)).map(socket => {
                                const isUnknown = isUnknownOutputFlowSocket(socket);
                                return (
                                    <div key={socket} className={`flow-node-socket${isUnknown ? " flow-node-socket--unknown" : ""}`}>
                                        <div className={"flow-node-socket-head"}>
                                            <span className={"flow-node-type-badge"} style={{ background: FLOW_COLOR }}>flow</span>
                                            {isDynamicFlowNode ? (
                                                <input
                                                    key={socket}
                                                    defaultValue={socket}
                                                    className={"flow-node-flow-name nodrag"}
                                                    title={"Rename output flow — outputs fire in sorted order"}
                                                    onBlur={(e) => renameOutputFlow(socket, e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
                                                />
                                            ) : (
                                                <label htmlFor={socket} title={isUnknown ? `"${socket}" is not a valid output flow socket for "${node?.op}"` : undefined}>{socket}</label>
                                            )}
                                            <RenderIf shouldShow={isUnknown}>
                                                <span className={"flow-node-type-warning"} title={`Unknown output flow socket "${socket}"`}>⚠</span>
                                            </RenderIf>
                                        </div>
                                        <Handle type="source" position={Position.Right} id={socket} style={handleStyle(FLOW_COLOR, "right", isDynamicFlowNode ? FLOW_NAME_HEAD_CENTER : SOCKET_HEAD_CENTER)} />
                                    </div>
                                )
                            })}
                            <RenderIf shouldShow={isDynamicFlowNode}>
                                <div className={"flow-node-add"} title={"Add output flow"} onClick={addOutputFlow}>+</div>
                            </RenderIf>
                        </div>
                    </div>
                </RenderIf>

                <RenderIf shouldShow={props.data.isNoOp === true}>
                    <Handle type="target" position={Position.Left} id={"in"} style={handleStyle(FLOW_COLOR, "left", undefined)} />
                    <p>NoOp</p>
                </RenderIf>

                <RenderIf shouldShow={Object.keys(inputValues).length > 0 || Object.keys(outputValues).length > 0}>
                    <hr />
                    {/*values*/}
                    <div className={"flow-node-row"}>
                        {/*inputValues*/}
                        <div>
                            {Object.entries(inputValues).map(([socket, value]) => {
                                const isLinked = (props.data.linked && props.data.linked[socket]) || node?.values?.input?.[socket]?.node !== undefined;
                                const isUnknown = isUnknownInputValueSocket(socket);
                                const resolvedInputType = resolveSocketType(socket, value);
                                const typeMismatch = isUnknown
                                    ? `Unknown input value socket "${getInputSocketFullLabel(socket)}": "${node?.op}" does not declare this socket`
                                    : getInputTypeMismatch(socket, value, resolvedInputType) ?? getGroupTypeConflict(socket, value) ?? getMissingValueWarning(socket, value);
                                const inputType = getDisplaySocketType(socket, value, resolvedInputType);
                                const signature = standardTypes[value.type ?? -1]?.signature;
                                const isRefSocket = signature === InteractivityValueType.REF;
                                const isBoolSocket = signature === InteractivityValueType.BOOLEAN;
                                // vector/matrix sockets render a grid of per-component fields
                                const vecLayout = signature ? VECTOR_MATRIX_LAYOUTS[signature] : undefined;
                                // the type badge doubles as the type selector when the socket accepts
                                // more than one type, isn't the pointer node's fixed value socket, and
                                // isn't wired to an output (a connection dictates the type automatically)
                                const isTypeEditable = (value.typeOptions?.length ?? 0) > 1 && !(isPointerNode && socket === "value") && !isLinked;
                                const socketLabelTitle = [
                                    isVariableSetNode ? `${getInputSocketFullLabel(socket)} (variable #${socket})` : undefined,
                                    value.description,
                                ].filter(Boolean).join("\n\n") || undefined;
                                return (
                                    <div key={socket} className={`flow-node-socket${isUnknown ? " flow-node-socket--unknown" : ""}`}>
                                        <div className={"flow-node-socket-head"} title={value.description}>
                                            {isTypeEditable ? (
                                                <span className={"flow-node-type-badge flow-node-type-badge--editable nodrag"} style={{ background: getColorForTypeIndex(inputType) }} title={"Change type"}>
                                                    {getTypeLabel(inputType)}
                                                    <span className={"flow-node-type-badge-arrow"}>▾</span>
                                                    <select id={`typeDropDown-${socket}`} className={"flow-node-type-badge-select"} disabled={isUnknown} onChange={onChangeType} value={value.type}>
                                                        {(value.typeOptions || []).map((type, index) => (
                                                            <option key={index} value={type}>
                                                                {standardTypes[type]?.name ?? standardTypes[type]?.signature ?? String(type)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </span>
                                            ) : (
                                                <span className={"flow-node-type-badge"} style={{ background: getColorForTypeIndex(inputType) }}>{getTypeLabel(inputType)}</span>
                                            )}
                                            <label htmlFor={socket} title={socketLabelTitle}>{getInputSocketLabel(socket)}</label>
                                            <RenderIf shouldShow={typeMismatch !== undefined}>
                                                <span className={"flow-node-type-warning"} title={typeMismatch}>⚠</span>
                                            </RenderIf>
                                        </div>
                                        {isRefSocket ? (
                                            <div style={{ display: isLinked ? "none" : "flex", gap: 4 }}>
                                                <input
                                                    id={`in-${socket}`}
                                                    name={socket}
                                                    className={"flow-node-control nodrag"}
                                                    style={{ flex: 1, minWidth: 0, fontFamily: "monospace" }}
                                                    placeholder={"/nodes/..."}
                                                    value={String(inputValues[socket].value ?? "")}
                                                    readOnly={isUnknown}
                                                    onChange={(e) => setSocketRefValue(socket, e.target.value)}
                                                />
                                                <button type="button" disabled={isUnknown} onClick={() => setRefPickerSocket(socket)} style={refSelectButtonStyle} title={"Select an object reference"}>
                                                    Select…
                                                </button>
                                            </div>
                                        ) : vecLayout ? (
                                            <div
                                                className={"flow-node-vec-grid nodrag"}
                                                style={{ display: isLinked ? "none" : "grid", gridTemplateColumns: `repeat(${vecLayout.cols}, 46px)`, gap: 4 }}
                                            >
                                                {Array.from({ length: vecLayout.rows }).flatMap((_, row) =>
                                                    Array.from({ length: vecLayout.cols }).map((__, col) => {
                                                        const idx = col * vecLayout.rows + row;
                                                        const compVal = inputValues[socket].value?.[idx];
                                                        return (
                                                            <input
                                                                key={idx}
                                                                type="number"
                                                                step="any"
                                                                className={"flow-node-vec-cell nodrag"}
                                                                title={getComponentTitle(vecLayout, row, col)}
                                                                placeholder={getComponentTitle(vecLayout, row, col)}
                                                                value={compVal === undefined || (typeof compVal === "number" && Number.isNaN(compVal)) ? "" : compVal}
                                                                readOnly={isUnknown}
                                                                onChange={(e) => onChangeComponent(socket, idx, e.target.value)}
                                                            />
                                                        );
                                                    })
                                                )}
                                            </div>
                                        ) : isBoolSocket ? (
                                            <div style={{ display: isLinked ? "none" : "block", textAlign: "left" }}>
                                                <BoolSwitch
                                                    checked={Array.isArray(value.value) ? Boolean(value.value[0]) : false}
                                                    disabled={isUnknown}
                                                    onChange={(checked) => onChangeBoolean(socket, checked)}
                                                />
                                            </div>
                                        ) : (
                                            <input id={`in-${socket}`} name={socket} className={"nodrag"} onChange={onChangeParameter} defaultValue={inputValues[socket].value} readOnly={isUnknown} style={{ display: isLinked ? "none" : "block" }} />
                                        )}
                                        <Handle type="target" position={Position.Left} id={socket} style={handleStyle(getColorForTypeIndex(inputType), "left")} />
                                    </div>
                                )
                            })}
                        </div>

                        {/*outputValues*/}
                        <div className={"flow-node-outputs"}>
                            {Object.entries(outputValues).map(([socket, _value]) => {
                                // a grouped output adopts its group's resolved type (e.g. math/add's
                                // "value" tracks whatever concrete type a/b have resolved to)
                                const outputGroup = _value.typeGroup ?? nodeSpec?.values?.output?.[socket]?.typeGroup;
                                const outputType = outputGroup !== undefined ? (getGroupType(outputGroup) ?? _value.type) : _value.type;
                                return (
                                    <div key={socket} className={"flow-node-socket"}>
                                        <div className={"flow-node-socket-head"} title={_value.description}>
                                            <span className={"flow-node-type-badge"} style={{ background: getColorForTypeIndex(outputType) }}>{getTypeLabel(outputType)}</span>
                                            <label htmlFor={socket} title={_value.description}>{socket}</label>
                                        </div>
                                        <Handle type="source" position={Position.Right} id={socket} style={handleStyle(getColorForTypeIndex(outputType), "right")} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </RenderIf>

                {/* interpolate nodes: normalized easing-curve preview for the p1/p2 control points, with common presets */}
                <RenderIf shouldShow={showInterpolationCurve}>
                    <hr />
                    <InterpolationCurveField
                        p1={readControlPoint("p1")}
                        p2={readControlPoint("p2")}
                        onChange={setInterpolationControlPoints}
                    />
                </RenderIf>

                {/* event/send: live chronology of when this custom event fires (spam-aggregated per frame) */}
                <RenderIf shouldShow={node?.op === "event/send" && configuredEvent !== undefined}>
                    <hr />
                    <CustomEventSendMonitor event={configuredEvent!} />
                </RenderIf>

                {/* event/receive: manual trigger with per-argument inputs */}
                <RenderIf shouldShow={node?.op === "event/receive" && configuredEvent !== undefined}>
                    <hr />
                    <CustomEventReceiveTrigger event={configuredEvent!} />
                </RenderIf>

                {/* pointer-driven events: live fire chronology of when the watched node was selected/hovered */}
                <RenderIf shouldShow={node?.op === "event/onSelect" || node?.op === "event/onHoverIn" || node?.op === "event/onHoverOut"}>
                    <hr />
                    <PointerEventMonitor op={node?.op ?? ""} nodeIndex={Number(configuration.nodeIndex?.value?.[0] ?? -1)} />
                </RenderIf>
            </div>

            <RefValuePicker
                show={refPickerSocket !== null}
                currentValue={refPickerSocket ? String(inputValues[refPickerSocket]?.value ?? "") : undefined}
                hintSocket={refPickerSocket ?? undefined}
                onClose={() => setRefPickerSocket(null)}
                onSelect={(pointer) => { if (refPickerSocket) { setSocketRefValue(refPickerSocket, pointer); } }}
            />

            <RefValuePicker
                show={showNodeIndexPicker}
                currentValue={`/nodes/${configuration.nodeIndex?.value?.[0] ?? -1}`}
                onlyCategoryId={"nodes"}
                title={"Select node"}
                onClose={() => setShowNodeIndexPicker(false)}
                onSelect={(pointer) => onChangeNodeIndex(Number(pointer.replace("/nodes/", "")))}
            />
        </div>
    )
}
