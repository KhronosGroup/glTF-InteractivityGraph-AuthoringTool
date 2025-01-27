import * as React from "react";
import {useCallback, useContext, useEffect, useState} from "react";
import { Handle, Position} from "reactflow";

import {RenderIf} from "../components/RenderIf";
import { IInteractivityFlow, IInteractivityValue, IInteractivityNode, IInteractivityConfigurationValue, IInteractivityEvent, IInteractivityVariable } from "../types/InteractivityGraph";
import { knownNodes, standardTypes } from "../types/nodes";
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

//TODO: add a graph context and use it for maanging updates to the graph
export const AuthoringGraphNode = (props: IAuthoringGraphNodeProps) => {
    const [inputFlows, setInputFlows] = useState<Record<string, IInteractivityFlow>>({});
    const [outputFlows, setOutputFlows] = useState<Record<string, IInteractivityFlow>>({});
    const [inputValues, setInputValues] = useState<Record<string, IInteractivityValue>>({});
    const [outputValues, setOutputValues] = useState<Record<string, IInteractivityValue>>({});
    const [configuration, setConfiguration] = useState<Record<string, IInteractivityConfigurationValue>>({});

    const {graph, updateNode} = useContext(InteractivityGraphContext);
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
        }
    }, [node]);

    useEffect(() => {
        if (Object.keys(inputValues).length > 0 && node) {
            const nodeCopy = JSON.parse(JSON.stringify(node));

            nodeCopy.values = nodeCopy.values || {};
            nodeCopy.values.input = inputValues;
            updateNode(nodeCopy, uid);
        }
    }, [inputValues, node]);

    useEffect(() => {
        if (Object.keys(outputValues).length > 0 && node) {
            const nodeCopy = JSON.parse(JSON.stringify(node));
            nodeCopy.values = nodeCopy.values || {};
            nodeCopy.values.output = outputValues;
            updateNode(nodeCopy, uid);
        }
    }, [outputValues, node]);

    useEffect(() => {
        if (Object.keys(configuration).length > 0 && node) {
            const nodeCopy = JSON.parse(JSON.stringify(node));
            nodeCopy.configuration = configuration;
            updateNode(nodeCopy, uid);
        }
    }, [configuration, node]);

    const onChangeParameter = useCallback((evt: { target: { value: any; }; }) => {
        const socketId = (evt.target as HTMLInputElement).id.replace("in-", "");
        const curParam = inputValues[socketId];
        setInputValues({...inputValues, [socketId]: {value: castParameter(evt.target.value, standardTypes[curParam.type]!.name!), typeOptions:curParam.typeOptions, type:curParam.type}});
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
        evaluateConfigurationWhichChangeSockets();
    }, []);

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


    const evaluateConfigurationWhichChangeSockets = useCallback(() => {
        const nodeType = node?.op;

        const inputValuesToSet: Record<string, IInteractivityValue> = {};
        const outputValuesToSet: Record<string, IInteractivityValue> = {};
        const inputFlowsToSet: Record<string, IInteractivityFlow> = {};
        const outputFlowsToSet: Record<string, IInteractivityFlow> = {};

        if (configuration.inputFlows !== undefined) {
            const numberInputFlows = Number(configuration.inputFlows.value?.[0] || 0);
            for (let i = 0; i < numberInputFlows; i++) {
                const inputFlow: IInteractivityFlow = {
                    node: undefined,
                    socket: undefined
                }
                inputFlowsToSet[`${i}`] = inputFlow;
            }
        }
        if (configuration.cases !== undefined) {
            let cases = configuration.cases.value?.[0] || "";
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
            for (let i = 0; i < cases.length; i++) {
                const outputFlow: IInteractivityFlow = {
                    node: undefined,
                    socket: undefined
                }
                outputFlowsToSet[`${i}`] = outputFlow;
            }
        }
        if (configuration.event !== undefined) {
            const customEventId: number = JSON.parse(configuration.event.value?.[0] || "");
            const ce: IInteractivityEvent = props.data.events[customEventId];

            if (ce.values === undefined) {return}

            for (const key of Object.keys(ce.values)) {
                const type = ce.values[key].type;
                
                const value: IInteractivityValue = {
                    value: [undefined],
                    typeOptions: [type],
                    type: type
                }
                inputValuesToSet[key] = value;

                if (nodeType === "event/send") {
                    inputValuesToSet[key] = value;
                } else if (nodeType === "event/receive") {
                    outputValuesToSet[key] = value;
                }
            }

            
        }
        if (configuration.pointer !== undefined) {
            const vals = parsePath(configuration.pointer.value?.[0] || "");
            for (let i = 0; i < vals.length; i++) {
                const value: IInteractivityValue = {value: [undefined], typeOptions: [2], type: 2}
                inputValuesToSet[vals[i]] = value;
            }
        }
        if (configuration.easingType !== undefined) {
            if (configuration.easingType.value?.[0] === "0") {
                // CUBIC BEZIER
                inputValuesToSet["cp1"] = {value: [NaN, NaN], typeOptions: [2], type: 2};
                inputValuesToSet["cp2"] = {value: [NaN, NaN], typeOptions: [2], type: 2};
            }
        }
        if (configuration.variable !== undefined) {
            const variableId = Number(configuration.variable.value?.[0] || 0);
            const v: IInteractivityVariable = graph.variables[variableId];
            const value: IInteractivityValue =  {typeOptions: [v.type], type: v.type, value: [undefined]}

            if (nodeType === "variable/set") {
                inputValuesToSet["value"] = value;
            } else if (nodeType === "variable/get") {
                outputValuesToSet["value"] = value;
            }
        }
        if (configuration.stopMode !== undefined) {
            if (configuration.stopMode.value?.[0] === "1") {
                // EXACT FRAME TIME
                inputValuesToSet["stopTime"] = {value: [NaN], typeOptions: [2], type: 2};
            }
        }

        setOutputFlows({...outputFlows, ...outputFlowsToSet});
        setInputFlows({...inputFlows, ...inputFlowsToSet});
        setInputValues({...inputValues, ...inputValuesToSet});
        setOutputValues({...outputValues, ...outputValuesToSet});
    }, [inputValues, outputValues, inputFlows, outputFlows, node])

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
                                <select id="event" name="event" onChange={(event) => {
                                    if (Number(event.target.value) === -1) {
                                        return
                                    }
                                    onChangeConfiguration(event)
                                }} >
                                    <option key={-1} value={-1} selected={configuration.event.value === undefined}>--NO SELECTION--</option>
                                    {
                                        props.data.events.map((ce: any, index: number) => (
                                            <option key={index} value={index} selected={configuration.event.value?.[0] == index}>{ce.id}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        }
                        {
                            (configuration.variable !== undefined) &&
                            <div>
                                <label htmlFor="variable">variable</label>
                                <select id="variable" name="variable" onChange={(event) => {
                                    if (Number(event.target.value) === -1) {
                                        return
                                    }
                                    onChangeConfiguration(event)
                                }}>
                                    <option key={-1} value={-1} selected={configuration.variable.value === undefined}>--NO SELECTION--</option>
                                    {

                                        props.data.variables.map((v: any, index: number) => (
                                            <option key={index} value={index} selected={configuration.variable.value?.[0] == index}>{v.name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        }
                        {
                            Object.keys(configuration)
                            .filter((configurationId) => configurationId !== "event" && configurationId !== "variable")
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
                            <RenderIf shouldShow={knownNodes[props.data.interactivityNode.decleration].op === "flow/sequence" || knownNodes[props.data.interactivityNode.decleration].op === "flow/multiGate"}>
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
