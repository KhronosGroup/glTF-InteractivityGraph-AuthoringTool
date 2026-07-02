import { CSSProperties, useCallback, useContext, useEffect, useState } from "react";
import { Handle, Position, useReactFlow, useUpdateNodeInternals } from "reactflow";

import { RenderIf } from "../components/RenderIf";
import { IInteractivityFlow, IInteractivityValue, IInteractivityNode, IInteractivityConfigurationValue, IInteractivityEvent, IInteractivityVariable, InteractivityValueType } from "../BasicBehaveEngine/types/InteractivityGraph";
import { anyType, interactivityNodeSpecs, standardTypes } from "../BasicBehaveEngine/types/nodes";
import { InteractivityGraphContext } from "../InteractivityGraphContext";
import { getMessageTemplateSocketIds, getPathTemplateSockets } from "./pathTemplate";
import { PointerConfigField } from "./PointerConfigField";
import { getStandardTypeIndexForSignature } from "./pointerCatalogue";
import { FLOW_COLOR, getColorForTypeIndex, getTypeLabel } from "./socketColors";
import { RefValuePicker } from "./RefValuePicker";
import { VariablesConfigField } from "./VariablesConfigField";
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
    const { graph } = useContext(InteractivityGraphContext);
    const updateNodeInternals = useUpdateNodeInternals();
    const { deleteElements } = useReactFlow();
    const uid = props.data.uid;
    const [node, setNode] = useState<IInteractivityNode | null>(null);
    // which ref input socket currently has the object picker open (null = closed)
    const [refPickerSocket, setRefPickerSocket] = useState<string | null>(null);

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

    // set a ref socket's static value (a JSON pointer string) from the picker or manual entry
    const setSocketRefValue = useCallback((socket: string, pointer: string) => {
        const curParam = inputValues[socket];
        if (!curParam) { return; }
        setInputValues({ ...inputValues, [socket]: { value: castParameter(pointer, standardTypes[curParam.type!]?.name ?? ""), typeOptions: curParam.typeOptions, type: curParam.type } });
    }, [inputValues]);

    const onChangeType = useCallback((evt: { target: { value: any; }; }) => {
        const socketId = (evt.target as HTMLInputElement).id.replace("typeDropDown-", "");
        const curParam = inputValues[socketId];
        const newParam: IInteractivityValue = { value: [undefined], typeOptions: curParam.typeOptions, type: evt.target.value }
        setInputValues({ ...inputValues, [socketId]: newParam });
    }, [inputValues]);

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
                inputValuesToSet[key] = existing;
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
                outputValuesToSet[key] = outputValues[key];
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

    // Determine the effective type of an input socket. A wired socket takes its type from the
    // connected source output socket (auto-detected), so its own type/typeOptions are ignored.
    // The connection lives on the shared graph model (mutated on connect), which may be ahead of
    // this node's local `value` state. Fall back to the socket's own type when unconnected.
    const resolveSocketType = (socket: string, value: IInteractivityValue): number | undefined => {
        const link = node?.values?.input?.[socket] ?? value;
        if (link?.node !== undefined) {
            const sourceNode = graph.nodes.find(n => n.uid === link.node);
            const sourceType = sourceNode?.values?.output?.[link.socket!]?.type;
            if (sourceType !== undefined) {
                return sourceType;
            }
        }
        return value?.type;
    }

    const getHeaderColor = (name: string) => {
        const category = name.split("/")[0];
        switch (category) {
            case "flow":
                return "#b18cd9"
            case "event":
                return "#f8a848"
            case "math":
                return "#baf691"
            case "pointer":
                return "#7ddede"
            case "animation":
                return "#e1b739"
            case "node":
                return "#d97aff"
            case "variable":
                return "#59ef73"
            default:
                return "#868484"
        }
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
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id >= 0);
    };

    const isPointerNode = node?.op?.startsWith("pointer/") ?? false;
    // flow/sequence and flow/multiGate have user-managed, renamable output flow sockets
    const isDynamicFlowNode = node?.op === "flow/sequence" || node?.op === "flow/multiGate";

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

    return (
        <div className={`flow-node${isPointerNode ? " flow-node--pointer" : ""}`}>
            <div className={"flow-node-header"} style={{ background: getHeaderColor(node?.op || "") }}>
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
                                <select id="event" name="event" defaultValue={configuration.event.value?.[0] === undefined ? -1 : configuration.event.value[0]} onChange={(event) => {
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
                                <select id="variable" name="variable" defaultValue={configuration.variable.value?.[0] === undefined ? -1 : configuration.variable.value[0]} onChange={(event) => {
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
                            (configuration.type !== undefined) &&
                            <div className={"flow-node-field"}>
                                <label htmlFor="type">{isPointerNode ? "Pointer Type" : "type"}</label>
                                <select id="type" name="type" key={`type-${configuration.type.value?.[0]}`} defaultValue={configuration.type.value?.[0] === undefined ? -1 : configuration.type.value[0]} onChange={(event) => {
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
                                .filter((configurationId) => configurationId !== "event" && configurationId !== "variable" && configurationId !== "variables" && configurationId !== "type" && configurationId !== "pointer")
                                .map((configurationId) => {
                                    return (
                                        <div key={configurationId} className={"flow-node-field"}>
                                            <label htmlFor={configurationId}>{configurationId}</label>
                                            <input id={configurationId} name={configurationId} defaultValue={configuration[configurationId].value} onChange={onChangeConfiguration} />
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
                                            <label htmlFor={socket}>{socket}</label>
                                            <span className={"flow-node-type-badge"} style={{ background: FLOW_COLOR }}>flow</span>
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
                                            <span className={"flow-node-type-badge"} style={{ background: FLOW_COLOR }}>flow</span>
                                        </div>
                                        <Handle type="source" position={Position.Right} id={socket} style={handleStyle(FLOW_COLOR, "right")} />
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
                                const inputType = resolveSocketType(socket, value);
                                const signature = standardTypes[value.type ?? -1]?.signature;
                                const isRefSocket = signature === InteractivityValueType.REF;
                                // vector/matrix sockets render a grid of per-component fields
                                const vecLayout = signature ? VECTOR_MATRIX_LAYOUTS[signature] : undefined;
                                // the type badge doubles as the type selector when the socket accepts
                                // more than one type, isn't the pointer node's fixed value socket, and
                                // isn't wired to an output (a connection dictates the type automatically)
                                const isTypeEditable = (value.typeOptions?.length ?? 0) > 1 && !(isPointerNode && socket === "value") && !isLinked;
                                return (
                                    <div key={socket} className={"flow-node-socket"}>
                                        <div className={"flow-node-socket-head"}>
                                            <label htmlFor={socket}>{socket}</label>
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
                                        </div>
                                        {isRefSocket ? (
                                            <div style={{ display: isLinked ? "none" : "flex", gap: 4 }}>
                                                <input
                                                    id={`in-${socket}`}
                                                    name={socket}
                                                    className={"flow-node-control"}
                                                    style={{ flex: 1, minWidth: 0, fontFamily: "monospace" }}
                                                    placeholder={"/nodes/0"}
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
                                                                className={"flow-node-vec-cell"}
                                                                title={getComponentTitle(vecLayout, row, col)}
                                                                placeholder={getComponentTitle(vecLayout, row, col)}
                                                                value={compVal === undefined || (typeof compVal === "number" && Number.isNaN(compVal)) ? "" : compVal}
                                                                onChange={(e) => onChangeComponent(socket, idx, e.target.value)}
                                                            />
                                                        );
                                                    })
                                                )}
                                            </div>
                                        ) : (
                                            <input id={`in-${socket}`} name={socket} onChange={onChangeParameter} defaultValue={inputValues[socket].value} style={{ display: isLinked ? "none" : "block" }} />
                                        )}
                                        <Handle type="target" position={Position.Left} id={socket} style={handleStyle(getColorForTypeIndex(inputType), "left")} />
                                    </div>
                                )
                            })}
                        </div>

                        {/*outputValues*/}
                        <div className={"flow-node-outputs"}>
                            {Object.entries(outputValues).map(([socket, _value]) => {
                                return (
                                    <div key={socket} className={"flow-node-socket"}>
                                        <div className={"flow-node-socket-head"}>
                                            <label htmlFor={socket}>{socket}</label>
                                            <span className={"flow-node-type-badge"} style={{ background: getColorForTypeIndex(_value.type) }}>{getTypeLabel(_value.type)}</span>
                                        </div>
                                        <Handle type="source" position={Position.Right} id={socket} style={handleStyle(getColorForTypeIndex(_value.type), "right")} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
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
        </div>
    )
}
