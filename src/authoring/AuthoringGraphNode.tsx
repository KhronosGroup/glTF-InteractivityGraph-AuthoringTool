import * as React from "react";
import {useCallback, useEffect, useState} from "react";
import { Handle, Position} from "reactflow";

import {RenderIf} from "../components/RenderIf";
import { IInteractivityFlow, IInteractivityValue, IInteractivityNode, IInteractivityConfigurationValue } from "../types/InteractivityGraph";
import { knownNodes, standardTypes } from "../types/nodes";

require("../css/flowNodes.css");

export interface IAuthoringGraphNodeProps {
    node: IInteractivityNode,
    data: any
}

/**
 * AuthoringGraphNode component is a React component used to display and edit the properties of an authoring node in a flow-based visual programming environment.
 *
 * @component
 * @param {IAuthoringGraphNodeProps} props - The props for the AuthoringGraphNode component.
 * @param {IAuthoringNode} props.node - The authoring node data.
 * @param {any} props.data - Additional data related to the node, including configuration, values, and more KHR_interactivity specific values.
 * @returns {JSX.Element} - A JSX element representing the AuthoringGraphNode.
 */
export const AuthoringGraphNode = (props: IAuthoringGraphNodeProps) => {
    const [inputFlows, setInputFlows] = useState<Record<string, IInteractivityFlow>>({});
    const [outputFlows, setOutputFlows] = useState<Record<string, IInteractivityFlow>>({});
    const [inputValues, setInputValues] = useState<Record<string, IInteractivityValue>>({});
    const [outputValues, setOutputValues] = useState<Record<string, IInteractivityValue>>({});
    const [configuration, setConfiguration] = useState<Record<string, IInteractivityConfigurationValue>>({});

    useEffect(() => {
        setInputFlows(props.node.flows?.in || {});
        setOutputFlows(props.node.flows?.out || {});
        setInputValues(props.node.values?.in || {});
        setOutputValues(props.node.values?.out || {});
        setConfiguration(props.node.configuration || {});
        // evaluateConfigurationWhichChangeSockets();
    }, []);

    useEffect(() => {
        if (Object.keys(inputValues).length > 0) {
            props.data.interactivityNode.values.in = inputValues;
        }
    }, [inputValues])

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
        setConfiguration({...configuration, [configurationId]: evt.target.value});
    }, [configuration]);

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


    // const evaluateConfigurationWhichChangeSockets = () => {
    //     const nodeSpec: IAuthoringNode | undefined = authoringNodeSpecs.find(nodeSpec => nodeSpec.type === props.node.type);
    //     if (nodeSpec === undefined) {return}

    //     const inputValuesToSet: IValueSocketDescriptor[] = nodeSpec.input.values.slice();
    //     const outputValuesToSet: IValueSocketDescriptor[] = nodeSpec.output.values.slice();
    //     const inputFlowsToSet: IFlowSocketDescriptor[] = nodeSpec.input.flows.slice();
    //     const outputFlowsToSet: IFlowSocketDescriptor[] = nodeSpec.output.flows.slice();

    //     if (props.data.configuration.inputFlows !== undefined) {
    //         const numberInputFlows = Number(props.data.configuration.inputFlows);
    //         for (let i = 0; i < numberInputFlows; i++) {
    //             const inputFlow: IFlowSocketDescriptor = {
    //                 id: `${i}`,
    //                 description: `The ${i} inflow of this node`
    //             }
    //             inputFlowsToSet.push(inputFlow);
    //         }
    //     }
    //     if (props.data.configuration.cases !== undefined) {
    //         let cases = props.data.configuration.cases;
    //         // Allow input formats in the UI, such as:
    //         // - 0,1, (while typing)
    //         // - [0,1,2 (while typing)
    //         // - [0,1,2]
    //         // - 0,1,2
    //         if (typeof cases === "string") {
    //             if (cases.endsWith(",")) cases = cases.slice(0, -1);
    //             cases = cases.replace(/\s/g, '');
    //             if (!cases.startsWith("[")) cases = `[${cases}`;
    //             if (!cases.endsWith("]")) cases = `${cases}]`;
    //             try {
    //                 cases = JSON.parse(cases);
    //             }
    //             catch (e) {
    //                 console.error("Couldn't parse configuration array string: ", cases, e);
    //                 cases = [];
    //             }
    //         }            
    //         for (let i = 0; i < cases.length; i++) {
    //             const outputFlow: IFlowSocketDescriptor = {
    //                 id: `${cases[i]}`,
    //                 description: `The outflow of this node for case ${cases[i]}`
    //             }
    //             outputFlowsToSet.push(outputFlow);
    //         }
    //     }
    //     if (props.data.configuration.event !== undefined) {
    //         const customEventId: number = JSON.parse(props.data.configuration.event);
    //         const ce: ICustomEvent = props.data.events[customEventId];

    //         if (ce.values === undefined) {return}

    //         const values: IValueSocketDescriptor[] = [];
    //         for (let i = 0; i < ce.values.length; i++) {
    //             const type = props.data.types[ce.values[i].type];
    //             let typename;
    //             if (type.signature === "custom" && type.extensions) {
    //                 typename = Object.keys(type.extensions)[0]
    //             } else {
    //                 typename = type.signature;
    //             }
    //             const value: IValueSocketDescriptor = {
    //                 id: ce.values[i].id,
    //                 types: [typename],
    //                 description: `Value socket for ${ce.values[i].id}`
    //             }
    //             values.push(value);
    //         }

    //         if (props.node.type === "event/send") {
    //             inputValuesToSet.push(...values)
    //         } else if (props.node.type === "event/receive") {
    //             outputValuesToSet.push(...values);
    //         }
    //     }
    //     if (props.data.configuration.pointer !== undefined) {
    //         const vals = parsePath(props.data.configuration.pointer)
    //         for (let i = 0; i < vals.length; i++) {
    //             const value: IValueSocketDescriptor = {id: vals[i], types: ["int"], description: `Value for ${vals[i]}`}
    //             inputValuesToSet.push(value);
    //         }
    //     }
    //     if (props.data.configuration.easingType !== undefined) {
    //         if (props.data.configuration.easingType === "0") {
    //             // CUBIC BEZIER
    //             inputValuesToSet.push({id: "cp1", types: ["float", "float3", "float4"], description: "First control point"}, {id: "cp2", types: ["float","float3", "float4"], description: "Second control point"});
    //         }
    //     }
    //     if (props.data.configuration.variable !== undefined) {
    //         const variableId: number = JSON.parse(props.data.configuration.variable);
    //         const v: IVariable = props.data.variables[variableId];
    //         const value: IValueSocketDescriptor = {id: "value", types: [props.data.types[v.type].signature], value: v.value, description: 'Value Socket for this variable'}

    //         if (props.node.type === "variable/set") {
    //             inputValuesToSet.push(value);
    //         } else if (props.node.type === "variable/get") {
    //             outputValuesToSet.push(value);
    //         }
    //     }
    //     if (props.data.configuration.stopMode !== undefined) {
    //         if (props.data.configuration.stopMode === "1") {
    //             // EXACT FRAME TIME
    //             inputValuesToSet.push({id: "stopTime", types: ["float"], description: "Target time to stop at"});
    //         }
    //     }

    //     if (props.data.flowIds) {
    //         props.data.flowIds.forEach((flowId: string) => {
    //             const existingFlowId = outputFlowsToSet.findIndex(outFlow => outFlow.id === flowId);
    //             if (existingFlowId !== -1) {
    //                 outputFlowsToSet[existingFlowId] = {id: flowId, description: ""};
    //             } else {
    //                 outputFlowsToSet.push({id: flowId, description: ""});
    //             }
    //         })
    //     }

    //     setOutputFlows(outputFlowsToSet);
    //     setInputFlows(inputFlowsToSet);
    //     setInputValues(inputValuesToSet);
    //     setOutputValues(outputValuesToSet);
    // }

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
            <div style={{background: getHeaderColor(knownNodes[props.node.decleration].op), padding: 16, marginBottom: 8}}>
                <h2>
                    {knownNodes[props.node.decleration].op}
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
                                            <option key={index} value={index} selected={configuration.variable.value?.[0] == index}>{v.id}</option>
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
                            <RenderIf shouldShow={knownNodes[props.node.decleration].op === "flow/sequence" || knownNodes[props.node.decleration].op === "flow/multiGate"}>
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
                                            {value.typeOptions.map((type, index) => (
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
