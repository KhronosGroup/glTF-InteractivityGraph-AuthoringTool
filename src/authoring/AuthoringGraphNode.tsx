import { CSSProperties, useCallback, useContext, useEffect, useState } from "react";
import { Handle, Position, useReactFlow, useUpdateNodeInternals } from "reactflow";

import { RenderIf } from "../components/RenderIf";
import { IInteractivityFlow, IInteractivityValue, IInteractivityNode, IInteractivityConfigurationValue, IInteractivityEvent, IInteractivityVariable, InteractivityValueType, InteractivityConfigurationValueType } from "../BasicBehaveEngine/types/InteractivityGraph";
import { anyType, getTypeGroupMembers, interactivityNodeSpecs, resolveTypeGroupType, standardTypes } from "../BasicBehaveEngine/types/nodes";
import { InteractivityGraphContext } from "../InteractivityGraphContext";
import { getMessageTemplateSocketIds, getPathTemplateSockets } from "./pathTemplate";
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

const getStandardTypeIndex = (signature: InteractivityValueType): number => {
    const index = standardTypes.findIndex((type) => type.signature === signature);
    if (index === -1) {
        throw new Error(`Missing standard KHR_interactivity type ${signature}`);
    }
    return index;
}

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
    const [inputFlows, setInputFlows] = useState<Record<string, IInteractivityFlow>>({});
    const [outputFlows, setOutputFlows] = useState<Record<string, IInteractivityFlow>>({});
    const [inputValues, setInputValues] = useState<Record<string, IInteractivityValue>>({});
    const [outputValues, setOutputValues] = useState<Record<string, IInteractivityValue>>({});
    const [configuration, setConfiguration] = useState<Record<string, IInteractivityConfigurationValue>>({});
    const { graph, gltfObjectModel } = useContext(InteractivityGraphContext);
    const updateNodeInternals = useUpdateNodeInternals();
    const { deleteElements } = useReactFlow();
    const uid = props.data.uid;
    const [node, setNode] = useState<IInteractivityNode | null>(null);
    // which ref input socket currently has the object picker open (null = closed)
    const [refPickerSocket, setRefPickerSocket] = useState<string | null>(null);
    // whether the node-index configuration's node picker dialog is open
    const [showNodeIndexPicker, setShowNodeIndexPicker] = useState(false);

    useEffect(() => {
        const node: IInteractivityNode = graph.nodes.find(node => node.uid === uid)!;
        setNode(node);
    }, [graph, uid]);

    useEffect(() => {
        if (node) {
            setInputFlows(node.flows?.input || {});
            setOutputFlows(node.flows?.output || {});
            setInputValues(node.values?.input || {});
            setOutputValues(node.values?.output || {});
            setConfiguration(node.configuration || {});
            evaluateConfigurationWhichChangeSockets(node.configuration || {}, node.values?.input || {}, node.values?.output || {}, node.flows?.input || {}, node.flows?.output || {});
        }
    }, [node]);

    useEffect(() => {
        if (Object.keys(inputValues).length > 0 && node) {
            node.values = node.values || {};
            node.values.input = inputValues;
        }
    }, [inputValues, node]);

    useEffect(() => {
        if (Object.keys(outputValues).length > 0 && node) {
            node.values = node.values || {};
            node.values.output = outputValues;
            // output socket types may have changed; recolor this node's outgoing wires to match
            props.data.recolorEdges?.(props.data.uid);
        }
    }, [outputValues, node]);

    useEffect(() => {
        if (Object.keys(configuration).length > 0 && node) {
            node.configuration = configuration;
        }
    }, [configuration, node]);

    // Adding/renaming flow sockets changes the Handle ids, but reactflow caches each node's
    // handle geometry. Refresh it so edges retargeted to the new socket id re-attach instead of
    // detaching (see the "Couldn't create edge for source handle id" note in AuthoringComponent).
    useEffect(() => {
        updateNodeInternals(uid);
    }, [uid, updateNodeInternals, Object.keys(inputFlows).join(","), Object.keys(outputFlows).join(",")]);

    const onChangeParameter = useCallback((evt: { target: { value: any; }; }) => {
        const socketId = (evt.target as HTMLInputElement).id.replace("in-", "");
        const curParam = inputValues[socketId];
        setInputValues({ ...inputValues, [socketId]: { value: castParameter(evt.target.value, standardTypes[curParam.type!]!.name!), typeOptions: curParam.typeOptions, type: curParam.type } });
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
        const newParam: IInteractivityValue = { ...curParam, value: [undefined], type: newType };
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

    const onChangeConfiguration = useCallback((evt: { target: { value: any; }; }) => {
        const configurationId = (evt.target as HTMLInputElement).id;
        // TODO: how can I properly pares the value for config without knowing type
        setConfiguration({ ...configuration, [configurationId]: { value: [evt.target.value] } });
        evaluateConfigurationWhichChangeSockets({ ...configuration, [configurationId]: { value: [evt.target.value] } }, inputValues, outputValues, inputFlows, outputFlows);
    }, [inputValues, outputValues, inputFlows, outputFlows, node]);

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
        inputValues: Record<string, IInteractivityValue>,
        outputValues: Record<string, IInteractivityValue>,
        inputFlows: Record<string, IInteractivityFlow>,
        outputFlows: Record<string, IInteractivityFlow>) => {
        //TODO: this function is quite a mess with lots of branches and has often been the root cause of the bugs in the authroing tool overwriting sockets, think of a better way to do this
        const nodeType = node?.op;

        const inputValuesToSet: Record<string, IInteractivityValue> = {};
        const outputValuesToSet: Record<string, IInteractivityValue> = {};
        const inputFlowsToSet: Record<string, IInteractivityFlow> = {};
        const outputFlowsToSet: Record<string, IInteractivityFlow> = {};
        // pointer template slot id -> its required type, so a slot whose kind (index/ref) changed
        // adopts the new type instead of keeping the stale socket
        const pointerSlotTypeById = new Map<string, number>();

        if (updatedConfiguration.inputFlows !== undefined) {
            const numberInputFlows = Number(updatedConfiguration.inputFlows.value?.[0] || 0);
            for (let i = 0; i < numberInputFlows; i++) {
                const inputFlow: IInteractivityFlow = {
                    node: undefined,
                    socket: undefined
                }
                inputFlowsToSet[`${i}`] = inputFlow;
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
                let casesesString = cases[0];
                if (casesesString.endsWith(",")) casesesString = casesesString.slice(0, -1);
                casesesString = casesesString.replace(/\s/g, '');
                if (!casesesString.startsWith("[")) casesesString = `[${casesesString}`;
                if (!casesesString.endsWith("]")) casesesString = `${casesesString}]`;
                try {
                    cases = JSON.parse(casesesString);
                }
                catch (e) {
                    console.error("Couldn't parse configuration array string: ", casesesString, e);
                    cases = [];
                }
            }
            if (nodeType === "flow/switch") {
                for (let i = 0; i < cases.length; i++) {
                    const outputFlow: IInteractivityFlow = {
                        node: undefined,
                        socket: undefined
                    }
                    outputFlowsToSet[`${cases[i]}`] = outputFlow;
                }
            } else if (nodeType === "math/switch") {
                for (let i = 0; i < cases.length; i++) {
                    const inputValue: IInteractivityValue = {
                        value: [undefined],
                        typeOptions: anyType,
                        typeGroup: "T",
                        type: 0
                    }
                    inputValuesToSet[`${cases[i]}`] = inputValue;
                }
            }

        }
        if (updatedConfiguration.event !== undefined && updatedConfiguration.event.value?.[0] != null) {
            const customEventId = Number(updatedConfiguration.event.value?.[0]);
            const ce: IInteractivityEvent = props.data.events[customEventId];

            if (ce.values === undefined) { return }

            for (const key of Object.keys(ce.values)) {
                const currentValue = inputValues[key];
                const type = ce.values[key].type;
                const value: IInteractivityValue = {
                    value: [undefined],
                    typeOptions: [type],
                    type: type
                }
                const valueToSet = currentValue === undefined ? value : currentValue;
                if (nodeType === "event/send") {
                    inputValuesToSet[key] = valueToSet;
                } else if (nodeType === "event/receive") {
                    outputValuesToSet[key] = valueToSet;
                }
            }


        }
        if (updatedConfiguration.pointer !== undefined) {
            const sockets = getPathTemplateSockets(updatedConfiguration.pointer.value?.[0] || "");
            const intTypeIndex = getStandardTypeIndex(InteractivityValueType.INT);
            const refTypeIndex = getStandardTypeIndex(InteractivityValueType.REF);
            for (const socket of sockets) {
                const type = socket.kind === "index" ? intTypeIndex : refTypeIndex;
                const value: IInteractivityValue = { value: [undefined], typeOptions: [type], type }
                inputValuesToSet[socket.id] = value;
                pointerSlotTypeById.set(socket.id, type);
            }
        }
        if (updatedConfiguration.message !== undefined) {
            const vals = getMessageTemplateSocketIds(updatedConfiguration.message.value?.[0] || "");
            for (let i = 0; i < vals.length; i++) {
                const value: IInteractivityValue = { value: [undefined], typeOptions: anyType, type: 0 }
                inputValuesToSet[vals[i]] = value;
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
            const v: IInteractivityVariable = graph.variables[variableId];
            const valueToSet: IInteractivityValue = { typeOptions: [v.type], type: v.type, value: [undefined] }

            if (nodeType === "variable/interpolate") {
                inputValuesToSet["value"] = valueToSet;
            } else if (nodeType === "variable/get") {
                outputValuesToSet["value"] = valueToSet;
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
                variablesIdString = variablesIdString.replace(/\s/g, '');
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
                if (variableId == null) {
                    continue
                }
                const v: IInteractivityVariable = graph.variables[variableId];
                const valueToSet: IInteractivityValue = { typeOptions: [v.type], type: v.type, value: [undefined] }

                inputValuesToSet[variableId] = valueToSet;
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
                    const value: IInteractivityValue = { typeOptions: [typeId], type: typeId, value: [undefined] }
                    inputValuesToSet["value"] = value;
                    // mark so the stale-socket-preservation pass below doesn't restore the old "value" over this fresh type
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

        const nodeSpec: IInteractivityNode | undefined = interactivityNodeSpecs.find(node => node.op === nodeType);

        const nodeSpecInputValues: Record<string, IInteractivityValue> = nodeSpec?.values?.input || {};
        const nodeSpecOutputValues: Record<string, IInteractivityValue> = nodeSpec?.values?.output || {};
        const nodeSpecInputFlows: Record<string, IInteractivityFlow> = nodeSpec?.flows?.input || {};
        const nodeSpecOutputFlows: Record<string, IInteractivityFlow> = nodeSpec?.flows?.output || {};

        // We only want to set socket values that are either in the node's spec or are created as a result of the configuration
        // If the current node has a value for a socket we should use it otherwise we will use the node spec default (if it exists)
        // remaining sockets would have been populated during the above configuration evaluation
        // input sockets the configuration evaluation just (re)generated carry the freshly selected
        // type (e.g. pointer/set's "value" adopting the chosen pointer type). When such a socket has
        // no user data it must keep that fresh entry rather than being reset to the node spec default.
        const configGeneratedInputKeys = new Set(Object.keys(inputValuesToSet));
        const knownInputValueKeys = [...Object.keys(nodeSpecInputValues), ...Object.keys(inputValuesToSet)];
        for (const key of knownInputValueKeys) {
            const existing = inputValues[key];
            const existingHasData = existing !== undefined && (existing.value?.[0] != null || existing.node != null);
            // if a pointer slot's kind changed (index <-> ref) its type differs, so keep the
            // freshly generated socket rather than restoring the stale one
            const pointerSlotType = pointerSlotTypeById.get(key);
            const pointerSlotKindChanged = pointerSlotType !== undefined && existing !== undefined && existing.type !== pointerSlotType;
            if (existingHasData && !pointerSlotKindChanged) {
                // the loaded/wired socket may predate the spec's `description` (e.g. loaded from a
                // glTF file, which has no such field) — backfill it from the spec without touching
                // the actual value/connection data
                inputValuesToSet[key] = existing.description === undefined && nodeSpecInputValues[key]?.description !== undefined
                    ? { ...existing, description: nodeSpecInputValues[key].description }
                    : existing;
            } else if (!existingHasData && !configGeneratedInputKeys.has(key) && nodeSpecInputValues[key] !== undefined) {
                inputValuesToSet[key] = nodeSpecInputValues[key];
            }
        }

        // output sockets the configuration evaluation just (re)generated carry the freshly
        // selected type (e.g. pointer/get's "value" adopting the chosen pointer type) and must
        // not be reverted to existing state or the node spec default below
        const configGeneratedOutputKeys = new Set(Object.keys(outputValuesToSet));

        const knownOutputValueKeys = [...Object.keys(nodeSpecOutputValues), ...Object.keys(outputValuesToSet)];
        for (const key of knownOutputValueKeys) {
            if (configGeneratedOutputKeys.has(key)) {
                continue;
            }
            if (outputValues[key] !== undefined && (outputValues[key].value?.[0] != null || outputValues[key].node != null)) {
                const existing = outputValues[key];
                outputValuesToSet[key] = existing.description === undefined && nodeSpecOutputValues[key]?.description !== undefined
                    ? { ...existing, description: nodeSpecOutputValues[key].description }
                    : existing;
            } else if (nodeSpecOutputValues[key] !== undefined) {
                outputValuesToSet[key] = nodeSpecOutputValues[key];
            }
        }

        const knownInputFlowKeys = [...Object.keys(nodeSpecInputFlows), ...Object.keys(inputFlowsToSet)];
        for (const key of knownInputFlowKeys) {
            if (inputFlows[key] !== undefined && (inputFlows[key].node != null)) {
                inputFlowsToSet[key] = inputFlows[key];
            } else if (nodeSpecInputFlows[key] !== undefined) {
                inputFlowsToSet[key] = nodeSpecInputFlows[key];
            }
        }

        const knownOutputFlowKeys = [...Object.keys(nodeSpecOutputFlows), ...Object.keys(outputFlowsToSet)];
        for (const key of knownOutputFlowKeys) {
            if (outputFlows[key] !== undefined && (outputFlows[key].node != null)) {
                outputFlowsToSet[key] = outputFlows[key];
            } else if (nodeSpecOutputFlows[key] !== undefined) {
                outputFlowsToSet[key] = nodeSpecOutputFlows[key];
            }
        }
        if (nodeSpec?.op === "flow/sequence" || nodeSpec?.op === "flow/multiGate") {
            // flow sequence is a very special node which has sockets that are not in the node spec nor or generated based on configuration
            for (const key of Object.keys(outputFlows)) {
                outputFlowsToSet[key] = outputFlows[key];
            }
        }

        setOutputFlows(outputFlowsToSet);
        setInputFlows(inputFlowsToSet);
        setInputValues(inputValuesToSet);
        setOutputValues(outputValuesToSet);
    }, [inputValues, outputValues, inputFlows, outputFlows, node, configuration])

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
    const getInputTypeMismatch = (socket: string, value: IInteractivityValue, resolvedType: number | undefined): string | undefined => {
        const link = node?.values?.input?.[socket] ?? value;
        if (link?.node === undefined || resolvedType === undefined) { return undefined; }
        const expectedTypeOptions = nodeSpec?.values?.input?.[socket]?.typeOptions ?? value.typeOptions;
        if (expectedTypeOptions === undefined || expectedTypeOptions.includes(resolvedType)) { return undefined; }
        const expectedLabel = expectedTypeOptions.map((t) => getTypeLabel(t)).join(" | ");
        return `Type mismatch: wired value is ${getTypeLabel(resolvedType)}, but this socket expects ${expectedLabel}`;
    };

    // A wired socket's badge/handle should reflect the connected value's type only when that type
    // is actually one the socket declares as acceptable — otherwise (a mismatch caught by
    // getInputTypeMismatch) showing the foreign type as if it were adopted is misleading, so fall
    // back to displaying the socket's own declared type instead.
    const getDisplaySocketType = (socket: string, value: IInteractivityValue, resolvedType: number | undefined): number | undefined => {
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
    const getOwnSocketType = (socket: string, value: IInteractivityValue): number | undefined => {
        const link = node?.values?.input?.[socket] ?? value;
        if (link?.node !== undefined) {
            const sourceNode = graph.nodes.find(n => n.uid === link.node);
            return sourceNode?.values?.output?.[link.socket!]?.type;
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
    const getGroupTypeConflict = (socket: string, value: IInteractivityValue): string | undefined => {
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
        return `Type group mismatch: this socket is ${getTypeLabel(ownType)}, but a sibling socket sharing the same type must match (${conflicting.join(", ")})`;
    };

    // KHR_interactivity requires every input socket to either be wired or carry a static value —
    // an unconnected socket left at its "no value entered yet" placeholder (undefined/NaN/empty
    // string, depending on the socket's shape) would export as invalid.
    const getMissingValueWarning = (socket: string, value: IInteractivityValue): string | undefined => {
        if (isSocketLinked(socket)) { return undefined; }
        // ref sockets store their pointer as a bare string rather than array-wrapped
        // (see castParameter/setSocketRefValue), so normalize both shapes before checking.
        const raw = value.value;
        const values = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
        const isUnset = values.length === 0 ||
            values.every((v) => v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v)));
        if (!isUnset) { return undefined; }
        return `Missing value: this socket is not connected and has no value set`;
    };

    // Determine the effective type of an input socket. A wired socket takes its type from the
    // connected source output socket (auto-detected), so its own type/typeOptions are ignored.
    // The connection lives on the shared graph model (mutated on connect), which may be ahead of
    // this node's local `value` state. Otherwise, a grouped socket adopts its group's resolved
    // type (so ungrouped-but-linked siblings stay visually consistent); finally fall back to the
    // socket's own type.
    const resolveSocketType = (socket: string, value: IInteractivityValue): number | undefined => {
        const link = node?.values?.input?.[socket] ?? value;
        if (link?.node !== undefined) {
            const sourceNode = graph.nodes.find(n => n.uid === link.node);
            const sourceType = sourceNode?.values?.output?.[link.socket!]?.type;
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
    const isDynamicFlowNode = node?.op === "flow/sequence" || node?.op === "flow/multiGate";

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
    const socketDescriptionLines = [
        ...Object.entries(inputValues).map(([socket, value]) => value.description ? `  ${socket}: ${value.description}` : undefined),
        ...Object.entries(outputValues).map(([socket, value]) => value.description ? `  ${socket}: ${value.description}` : undefined),
    ].filter(Boolean);
    const nodeHeaderTitle = [
        node?.description,
        `Node Index: ${nodeIndex}`,
        socketDescriptionLines.length > 0 ? `Sockets:\n${socketDescriptionLines.join("\n")}` : undefined,
    ].filter(Boolean).join("\n\n");

    // aggregate socket-level mismatches into a single node-header warning, so a type conflict on
    // any input is visible without having to scan every socket
    const typeMismatchLines = Object.entries(inputValues)
        .map(([socket, value]) => {
            const resolvedType = resolveSocketType(socket, value);
            return getInputTypeMismatch(socket, value, resolvedType) ?? getGroupTypeConflict(socket, value) ?? getMissingValueWarning(socket, value);
        })
        .filter((msg): msg is string => msg !== undefined);
    const nodeHeaderWarningTitle = typeMismatchLines.join("\n");

    return (
        <div className={`flow-node${isPointerNode ? " flow-node--pointer" : ""}${typeMismatchLines.length > 0 ? " flow-node--warning" : ""}`}>
            <div className={"flow-node-header"} style={{ background: getNodeCategoryColor(node?.op || "") }} title={nodeHeaderTitle}>
                <RenderIf shouldShow={typeMismatchLines.length > 0}>
                    <span className={"flow-node-header-warning"} title={nodeHeaderWarningTitle}>⚠</span>
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
                                return (
                                    <div key={socket} className={"flow-node-socket"}>
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
                                                <label htmlFor={socket}>{socket}</label>
                                            )}
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
                                const resolvedInputType = resolveSocketType(socket, value);
                                const typeMismatch = getInputTypeMismatch(socket, value, resolvedInputType) ?? getGroupTypeConflict(socket, value) ?? getMissingValueWarning(socket, value);
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
                                    <div key={socket} className={"flow-node-socket"}>
                                        <div className={"flow-node-socket-head"} title={value.description}>
                                            {isTypeEditable ? (
                                                <span className={"flow-node-type-badge flow-node-type-badge--editable nodrag"} style={{ background: getColorForTypeIndex(inputType) }} title={"Change type"}>
                                                    {getTypeLabel(inputType)}
                                                    <span className={"flow-node-type-badge-arrow"}>▾</span>
                                                    <select id={`typeDropDown-${socket}`} className={"flow-node-type-badge-select"} onChange={onChangeType} value={value.type}>
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
                                                    onChange={(e) => setSocketRefValue(socket, e.target.value)}
                                                />
                                                <button type="button" onClick={() => setRefPickerSocket(socket)} style={refSelectButtonStyle} title={"Select an object reference"}>
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
                                                    onChange={(checked) => onChangeBoolean(socket, checked)}
                                                />
                                            </div>
                                        ) : (
                                            <input id={`in-${socket}`} name={socket} className={"nodrag"} onChange={onChangeParameter} defaultValue={inputValues[socket].value} style={{ display: isLinked ? "none" : "block" }} />
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
