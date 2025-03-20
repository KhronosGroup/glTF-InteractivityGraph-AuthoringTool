import * as React from "react";
import {useCallback, useContext, useEffect, useState} from "react";
import { Handle, Position} from "reactflow";

import {RenderIf} from "../components/RenderIf";
import { IInteractivityFlow, IInteractivityValue, IInteractivityNode, IInteractivityConfigurationValue, IInteractivityEvent, IInteractivityVariable, IInteractivityValueType } from "../types/InteractivityGraph";
import { anyType, interactivityNodeSpecs, standardTypes } from "../types/nodes";
import { InteractivityGraphContext } from "../InteractivityGraphContext";

require("../css/flowNodes.css");

export interface IAuthoringGraphNodeProps {
    data: any
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
    const {graph} = useContext(InteractivityGraphContext);
    const uid = props.data.uid;
    const [node, setNode] = useState<IInteractivityNode | null>(null);

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
        }
    }, [outputValues, node]);

    useEffect(() => {
        if (Object.keys(configuration).length > 0 && node) {
            node.configuration = configuration;
        }
    }, [configuration, node]);

    const onChangeParameter = useCallback((evt: { target: { value: any; }; }) => {
        const socketId = (evt.target as HTMLInputElement).id.replace("in-", "");
        const curParam = inputValues[socketId];
        setInputValues({...inputValues, [socketId]: {value: castParameter(evt.target.value, standardTypes[curParam.type!]!.name!), typeOptions:curParam.typeOptions, type:curParam.type}});
    }, [inputValues]);

    const onChangeType = useCallback((evt: { target: { value: any; }; }) => {
        const socketId = (evt.target as HTMLInputElement).id.replace("-typeDropDown", "");
        const curParam = inputValues[socketId];
        setInputValues({...inputValues, [socketId]: {value: curParam.value, typeOptions:curParam.typeOptions, type:evt.target.value}});
    }, [inputValues]);

    const onChangeConfiguration = useCallback((evt: { target: { value: any; }; }) => {
        const configurationId = (evt.target as HTMLInputElement).id;
        // TODO: how can I properly pares the value for config without knowing type
        setConfiguration({...configuration, [configurationId]: {value: [evt.target.value]}});
        evaluateConfigurationWhichChangeSockets({...configuration, [configurationId]: {value: [evt.target.value]}}, inputValues, outputValues, inputFlows, outputFlows);
    }, [inputValues, outputValues, inputFlows, outputFlows, node]);

    const parsePath = (path: string): string[] => {
        const regex = /{([^}]+)}/g;
        const match = path.match(regex);
        const keys: string[] = [];

        if (!match) {
            return keys;
        }

        for (const m of match) {
            const key = m.slice(1, -1); // remove the curly braces from the match
            keys.push(key)
        }

        return keys;
    }


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
            let cases = updatedConfiguration.cases.value?.[0] || "";
            // Allow input formats in the UI, such as:
            // - 0,1, (while typing)
            // - [0,1,2 (while typing)
            // - [0,1,2]
            // - 0,1,2
            if (typeof cases === "string") {
                if (cases.endsWith(",")) cases = cases.slice(0, -1);
                cases = cases.replace(/\s/g, '');
                if (!cases.startsWith("[")) cases = `[${cases}`;
                if (!cases.endsWith("]")) cases = `${cases}]`;
                try {
                    cases = JSON.parse(cases);
                }
                catch (e) {
                    console.error("Couldn't parse configuration array string: ", cases, e);
                    cases = [];
                }
            }            
            if (nodeType === "flow/switch") {
                for (let i = 0; i < cases.length; i++) {
                    const outputFlow: IInteractivityFlow = {
                        node: undefined,
                        socket: undefined
                    }
                    outputFlowsToSet[`${i}`] = outputFlow;
                }
            } else if (nodeType === "math/switch") {
                for (let i = 0; i < cases.length; i++) {
                    const inputValue: IInteractivityValue = {
                        value: [undefined],
                        typeOptions: anyType,
                        type: 0
                    }
                    inputValuesToSet[`${i}`] = inputValue;
                }
            }
            
        }
        if (updatedConfiguration.event !== undefined && updatedConfiguration.event.value?.[0] != null) {
            const customEventId = Number(updatedConfiguration.event.value?.[0]);
            const ce: IInteractivityEvent = props.data.events[customEventId];

            if (ce.values === undefined) {return}

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
            const vals = parsePath(updatedConfiguration.pointer.value?.[0] || "");
            for (let i = 0; i < vals.length; i++) {
                const value: IInteractivityValue = {value: [undefined], typeOptions: [1], type: 1}
                inputValuesToSet[vals[i]] = value;
            }
        }
        if (updatedConfiguration.message !== undefined) {
            const vals = parsePath(updatedConfiguration.message.value?.[0] || "");
            for (let i = 0; i < vals.length; i++) {
                const value: IInteractivityValue = {value: [undefined], typeOptions: anyType, type: 0}
                inputValuesToSet[vals[i]] = value;
            }
        }
        if (updatedConfiguration.easingType !== undefined) {
            if (updatedConfiguration.easingType.value?.[0] === "0") {
                // CUBIC BEZIER
                inputValuesToSet["cp1"] = {value: [NaN, NaN], typeOptions: [2], type: 2};
                inputValuesToSet["cp2"] = {value: [NaN, NaN], typeOptions: [2], type: 2};
            }
        }
        if (updatedConfiguration.variable !== undefined) {
            const variableId = Number(updatedConfiguration.variable.value?.[0] || 0);
            const v: IInteractivityVariable = graph.variables[variableId];
            const currentValue: IInteractivityValue = inputValues["value"];
            const value: IInteractivityValue =  {typeOptions: [v.type], type: v.type, value: [undefined]}
            const valueToSet = currentValue === undefined ? value : currentValue;

            if (nodeType === "variable/set" || nodeType === "variable/interpolate") {
                inputValuesToSet["value"] = valueToSet;
            } else if (nodeType === "variable/get") {
                outputValuesToSet["value"] = valueToSet;
            }
        }
        if (updatedConfiguration.type !== undefined) {
            const typeId = Number(updatedConfiguration.type.value?.[0] || 0);
            if (nodeType === "pointer/get") {
                outputValuesToSet["value"] = {typeOptions: [typeId], type: typeId, value: [undefined]};
            } else {
                const noValuePresent = inputValues["value"] === undefined;
                const inlineValuePresent = inputValues["value"] !== undefined && inputValues["value"].node === undefined;

                // only wipe if the value is undefined or the value is inlined but the types are different
                if (noValuePresent || (inlineValuePresent && inputValues["value"].type !== typeId)) {
                    const value: IInteractivityValue =  {typeOptions: [typeId], type: typeId, value: [undefined]}
                    inputValuesToSet["value"] = value;
                }
            }
        }
        if (updatedConfiguration.stopMode !== undefined) {
            if (updatedConfiguration.stopMode.value?.[0] === "1") {
                // EXACT FRAME TIME
                inputValuesToSet["stopTime"] = {value: [NaN], typeOptions: [2], type: 2};
            }
        }

        const nodeSpec: IInteractivityNode | undefined = interactivityNodeSpecs.find(node => node.op === nodeType);

        console.log(nodeType)

        console.log(nodeSpec)
        
        const nodeSpecInputValues: Record<string, IInteractivityValue> = nodeSpec?.values?.input || {};
        const nodeSpecOutputValues: Record<string, IInteractivityValue> = nodeSpec?.values?.output || {};
        const nodeSpecInputFlows: Record<string, IInteractivityFlow> = nodeSpec?.flows?.input || {};
        const nodeSpecOutputFlows: Record<string, IInteractivityFlow> = nodeSpec?.flows?.output || {};

        // We only want to set socket values that are either in the node's spec or are created as a result of the configuration
        // If the current node has a value for a socket we should use it otherwise we will use the node spec default (if it exists)
        // remaining sockets would have been populated during the above configuration evaluation
        const knownInputValueKeys = [...Object.keys(nodeSpecInputValues), ...Object.keys(inputValuesToSet)];
        for (const key of knownInputValueKeys) {
            if (inputValues[key] !== undefined && (inputValues[key].value?.[0] != null || inputValues[key].node != null)) {
                inputValuesToSet[key] = inputValues[key];
            } else if (nodeSpecInputValues[key] !== undefined) {
                inputValuesToSet[key] = nodeSpecInputValues[key];
            }
        }

        const knownOutputValueKeys = [...Object.keys(nodeSpecOutputValues), ...Object.keys(outputValuesToSet)];
        for (const key of knownOutputValueKeys) {
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

    const getHeaderColor = (name:string) => {
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

    return (
        <div className={"flow-node"}>
            <div style={{background: getHeaderColor(node?.op || ""), padding: 16, marginBottom: 8}}>
                <h2>
                    {node?.op}
                </h2>
            </div>

            <div style={{padding: 16}}>
                <RenderIf shouldShow={Object.keys(configuration).length > 0}>
                    {/* configuration */}
                    <div>
                        {
                            (configuration.event !== undefined) &&
                            <div>
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
                            <div>
                                <label htmlFor="variable">variable</label>
                                <select id="variable" name="variable" defaultValue={configuration.variable.value?.[0] === undefined ? -1 : configuration.variable.value[0]} onChange={(event) => {
                                    if (Number(event.target.value) === -1) {
                                        return
                                    }
                                    onChangeConfiguration(event)
                                }}>
                                    <option key={-1} value={-1}>--NO SELECTION--</option>
                                    {

                                        props.data.variables.map((v: any, index: number) => (
                                            <option key={index} value={index}>{v.name || v.id}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        }
                        {
                            (configuration.type !== undefined) &&
                            <div>
                                <label htmlFor="type">type</label>
                                <select id="type" name="type" defaultValue={configuration.type.value?.[0] === undefined ? -1 : configuration.type.value[0]} onChange={(event) => {
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
                            .filter((configurationId) => configurationId !== "event" && configurationId !== "variable" && configurationId !== "type")
                            .map((configurationId) => {
                                return (
                                    <div key={configurationId}>
                                        <label htmlFor={configurationId}>{configurationId}</label>
                                        <input id={configurationId} name={configurationId} defaultValue={configuration[configurationId].value} onChange={onChangeConfiguration}/>
                                    </div>
                                )
                            })
                        }
                    </div>
                </RenderIf>

                <RenderIf shouldShow={Object.keys(inputFlows).length > 0 || Object.keys(outputFlows).length > 0}>
                    <hr/>
                    {/*flows*/}
                    <div className={"flow-node-row"}>
                        {/*inputFlows*/}
                        <div>
                            {Object.keys(inputFlows).map(socket => {
                                return (
                                    <div key={socket} className={"flow-node-socket"}>
                                        <label htmlFor={socket}>{socket}</label>
                                        <Handle type="target" position={Position.Left} id={socket} style={{left:-12}} />
                                    </div>
                                )
                            })}
                        </div>

                        {/*outputFlows*/}
                        <div>
                            {Object.keys(outputFlows).map(socket => {
                                return (
                                    <div key={socket} className={"flow-node-socket"}>
                                        <label htmlFor={socket}>{socket}</label>
                                        <Handle type="source" position={Position.Right} id={socket} style={{right:-12}} />
                                    </div>
                                )
                            })}
                            <RenderIf shouldShow={props.data.op === "flow/sequence" || props.data.op === "flow/multiGate"}>
                                <p onClick={() => {
                                    const outputFlow: IInteractivityFlow = {
                                        node: undefined,
                                        socket: undefined
                                    }
                                    const outFlowSocketName = Object.keys(outputFlows).length;
                                    setOutputFlows({...outputFlows, [outFlowSocketName]: outputFlow});
                                }}>+</p>
                            </RenderIf>
                        </div>
                    </div>
                </RenderIf>

                <RenderIf shouldShow={props.data.isNoOp === true}>
                    <Handle type="target" position={Position.Left} id={"in"} style={{left:4}} />
                    <p>NoOp</p>
                </RenderIf>

                <RenderIf shouldShow={Object.keys(inputValues).length > 0 || Object.keys(outputValues).length > 0}>
                    <hr/>
                    {/*values*/}
                    <div className={"flow-node-row"}>
                        {/*inputValues*/}
                        <div>
                            {Object.entries(inputValues).map(([socket, value]) => {
                                return (
                                    <div key={socket} className={"flow-node-socket"}>
                                        <label htmlFor={socket}>{socket}</label>
                                        <input id={`in-${socket}`} name={socket} onChange={onChangeParameter} defaultValue={inputValues[socket].value} style={{display: props.data.linked && props.data.linked[socket] ? "none" : "block"}}/>
                                        <select id={`${socket}-typeDropDown`} onChange={onChangeType} defaultValue={inputValues[socket].type} style={{display: props.data.linked && props.data.linked[socket] ? "none" : "block"}}>
                                            {(value.typeOptions || []).map((type, index) => (
                                                <option key={index} value={type}>
                                                    {standardTypes[type].name}
                                                </option>
                                            ))}
                                        </select>
                                        <Handle type="target" position={Position.Left} id={socket} style={{left:-12}} />
                                    </div>
                                )})}
                        </div>

                        {/*outputValues*/}
                        <div>
                            {Object.entries(outputValues).map(([socket, _value]) => {
                                return (
                                    <div key={socket} className={"flow-node-socket"}>
                                        <label htmlFor={socket}>{socket}</label>
                                        <Handle type="source" position={Position.Right} id={socket} style={{right:-12}} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </RenderIf>
            </div>
        </div>
    )
}
