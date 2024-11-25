import * as React from "react";
import {useCallback, useEffect, useState} from "react";
import { Handle, Position} from "reactflow";

import {
    ICustomEvent,
    IFlowSocketDescriptor,
    IAuthoringNode,
    IValueSocketDescriptor, IVariable,
    authoringNodeSpecs
} from "./AuthoringNodeSpecs";
import {RenderIf} from "../components/RenderIf";

require("../css/flowNodes.css");

export interface IAuthoringGraphNodeProps {
    node: IAuthoringNode,
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
    const [inputFlows, setInputFlows] = useState<IFlowSocketDescriptor[]>([]);
    const [outputFlows, setOutputFlows] = useState<IFlowSocketDescriptor[]>([]);
    const [inputValues, setInputValues] = useState<IValueSocketDescriptor[]>([]);
    const [outputValues, setOutputValues] = useState<IValueSocketDescriptor[]>([]);

    useEffect(() => {
        props.data.configuration = props.data.configuration || {};
        props.data.values = props.data.values || {};
        setInputFlows(props.node.input.flows);
        setOutputFlows(props.node.output.flows);
        setInputValues(props.node.input.values);
        setOutputValues(props.node.output.values);
        evaluateConfigurationWhichChangeSockets();
    }, []);

    const onChangeParameter = useCallback((evt: { target: { value: any; }; }) => {
        props.data.values = props.data.values || {};
        const curParam = props.data.values[(evt.target as HTMLInputElement).id.replace("in-", "")] || {};
        props.data.values[(evt.target as HTMLInputElement).id.replace("in-", "")] = {value: evt.target.value, type:curParam.type};
    }, []);

    const onChangeType = useCallback((evt: { target: { value: any; }; }) => {
        props.data.values = props.data.values || {};
        const curParam = props.data.values[(evt.target as HTMLInputElement).id.replace("-typeDropDown", "")] || {};
        props.data.values[(evt.target as HTMLInputElement).id.replace("-typeDropDown", "")] = {value: curParam.value, type:evt.target.value};
    }, []);

    const onChangeConfiguration = useCallback((evt: { target: { value: any; }; }) => {
        props.data.configuration = props.data.configuration || {}
        props.data.configuration[(evt.target as HTMLInputElement).id] = evt.target.value;
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


    const evaluateConfigurationWhichChangeSockets = () => {
        const nodeSpec: IAuthoringNode | undefined = authoringNodeSpecs.find(nodeSpec => nodeSpec.type === props.node.type);
        if (nodeSpec === undefined) {return}

        const inputValuesToSet: IValueSocketDescriptor[] = nodeSpec.input.values.slice();
        const outputValuesToSet: IValueSocketDescriptor[] = nodeSpec.output.values.slice();
        const inputFlowsToSet: IFlowSocketDescriptor[] = nodeSpec.input.flows.slice();
        const outputFlowsToSet: IFlowSocketDescriptor[] = nodeSpec.output.flows.slice();

        if (props.data.configuration.inputFlows !== undefined) {
            const numberInputFlows = Number(props.data.configuration.inputFlows);
            for (let i = 0; i < numberInputFlows; i++) {
                const inputFlow: IFlowSocketDescriptor = {
                    id: `${i}`,
                    description: `The ${i} inflow of this node`
                }
                inputFlowsToSet.push(inputFlow);
            }
        }
        if (props.data.configuration.cases !== undefined) {
            const cases: number[] = JSON.parse(props.data.configuration.cases);
            for (let i = 0; i < cases.length; i++) {
                const outputFlow: IFlowSocketDescriptor = {
                    id: `${cases[i]}`,
                    description: `The outflow of this node for case ${cases[i]}`
                }
                outputFlowsToSet.push(outputFlow);
            }
        }
        if (props.data.configuration.event !== undefined) {
            const customEventId: number = JSON.parse(props.data.configuration.event);
            const ce: ICustomEvent = props.data.events[customEventId];

            if (ce.values === undefined) {return}

            const values: IValueSocketDescriptor[] = [];
            for (let i = 0; i < ce.values.length; i++) {
                const type = props.data.types[ce.values[i].type];
                let typename;
                if (type.signature === "custom" && type.extensions) {
                    typename = Object.keys(type.extensions)[0]
                } else {
                    typename = type.signature;
                }
                const value: IValueSocketDescriptor = {
                    id: ce.values[i].id,
                    types: [typename],
                    description: `Value socket for ${ce.values[i].id}`
                }
                values.push(value);
            }

            if (props.node.type === "event/send") {
                inputValuesToSet.push(...values)
            } else if (props.node.type === "event/receive") {
                outputValuesToSet.push(...values);
            }
        }
        if (props.data.configuration.pointer !== undefined) {
            const vals = parsePath(props.data.configuration.pointer)
            for (let i = 0; i < vals.length; i++) {
                const value: IValueSocketDescriptor = {id: vals[i], types: ["int"], description: `Value for ${vals[i]}`}
                inputValuesToSet.push(value);
            }
        }
        if (props.data.configuration.easingType !== undefined) {
            if (props.data.configuration.easingType === "0") {
                // CUBIC BEZIER
                inputValuesToSet.push({id: "cp1", types: ["float", "float3", "float4"], description: "First control point"}, {id: "cp2", types: ["float","float3", "float4"], description: "Second control point"});
            }
        }
        if (props.data.configuration.variable !== undefined) {
            const variableId: number = JSON.parse(props.data.configuration.variable);
            const v: IVariable = props.data.variables[variableId];
            const value: IValueSocketDescriptor = {id: v.id, types: [props.data.types[v.type].signature], value: v.value, description: 'Value Socket for this variable'}

            if (props.node.type === "variable/set") {
                inputValuesToSet.push(value);
            } else if (props.node.type === "variable/get") {
                outputValuesToSet.push(value);
            }
        }
        if (props.data.configuration.stopMode !== undefined) {
            if (props.data.configuration.stopMode === "1") {
                // EXACT FRAME TIME
                inputValuesToSet.push({id: "stopTime", types: ["float"], description: "Target time to stop at"});
            }
        }

        if (props.data.flowIds) {
            props.data.flowIds.forEach((flowId: string) => {
                const existingFlowId = outputFlowsToSet.findIndex(outFlow => outFlow.id === flowId);
                if (existingFlowId !== -1) {
                    outputFlowsToSet[existingFlowId] = {id: flowId, description: ""};
                } else {
                    outputFlowsToSet.push({id: flowId, description: ""});
                }
            })
        }

        setOutputFlows(outputFlowsToSet);
        setInputFlows(inputFlowsToSet);
        setInputValues(inputValuesToSet);
        setOutputValues(outputValuesToSet);
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
            <div style={{background: getHeaderColor(props.node.type), padding: 16, marginBottom: 8}}>
                <h2>
                    {props.node.type}
                </h2>
            </div>

            <div style={{padding: 16}}>
                <RenderIf shouldShow={props.node.configuration.length > 0}>
                    {/*configuration*/}
                    <div>
                        {
                            (props.node.type === "event/receive" || props.node.type === "event/send") &&
                            <div>
                                <label htmlFor="event">event</label>
                                <select id="event" name="event" onChange={(event) => {
                                    console.log(props.data)
                                    if (Number(event.target.value) === -1) {
                                        return
                                    }
                                    onChangeConfiguration(event)
                                }} >
                                    <option key={-1} value={-1} selected={!props.data.configuration || !props.data.configuration.event}>--NO SELECTION--</option>
                                    {
                                        props.data.events.map((ce: any, index: number) => (
                                            <option key={index} value={index} selected={props.data.configuration && props.data.configuration.event == index}>{ce.id}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        }
                        {
                            (props.node.type === "variable/get" || props.node.type === "variable/set") &&
                            <div>
                                <label htmlFor="variable">variable</label>
                                <select id="variable" name="variable" onChange={(event) => {
                                    if (Number(event.target.value) === -1) {
                                        return
                                    }
                                    onChangeConfiguration(event)
                                }}>
                                    <option key={-1} value={-1} selected={!props.data.configuration || !props.data.configuration.variable}>--NO SELECTION--</option>
                                    {

                                        props.data.variables.map((v: any, index: number) => (
                                            <option key={index} value={index} selected={props.data.configuration && props.data.configuration.variable == index}>{v.id}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        }
                        {
                            !["event/send", "event/receive", "variable/set", "variable/get"].includes(props.node.type) &&
                            props.node.configuration.map((configuration, index) => {
                                return (
                                    <div key={index}>
                                        <label htmlFor={configuration.id}>{configuration.id}</label>
                                        <input id={configuration.id} name={configuration.id} defaultValue={props.data.configuration !== undefined ? props.data.configuration[configuration.id] : ""} onChange={onChangeConfiguration}/>
                                    </div>
                                )
                            })
                        }
                    </div>
                </RenderIf>

                <RenderIf shouldShow={inputFlows.length > 0 || outputFlows.length > 0}>
                    <hr/>
                    {/*flows*/}
                    <div className={"flow-node-row"}>
                        {/*inputFlows*/}
                        <div>
                            {inputFlows.map(socket => {
                                return (
                                    <div key={socket.id} className={"flow-node-socket"}>
                                        <label htmlFor={socket.id}>{socket.id}</label>
                                        <Handle type="target" position={Position.Left} id={socket.id} style={{left:-12}} />
                                    </div>
                                )
                            })}
                        </div>

                        {/*outputFlows*/}
                        <div>
                            {outputFlows.map(socket => {
                                return (
                                    <div key={socket.id} className={"flow-node-socket"}>
                                        <label htmlFor={socket.id}>{socket.id}</label>
                                        <Handle type="source" position={Position.Right} id={socket.id} style={{right:-12}} />
                                    </div>
                                )
                            })}
                            <RenderIf shouldShow={props.node.type === "flow/sequence" || props.node.type === "flow/multiGate"}>
                                <p onClick={() => {
                                    const outputFlow: IFlowSocketDescriptor = {
                                        id: `${outputFlows.length}`,
                                        description: `The ${outputFlows.length} outflow of this node`
                                    }
                                    setOutputFlows([...outputFlows, outputFlow]);
                                }}>+</p>
                            </RenderIf>
                        </div>
                    </div>
                </RenderIf>

                <RenderIf shouldShow={inputValues.length > 0 || outputValues.length > 0}>
                    <hr/>
                    {/*values*/}
                    <div className={"flow-node-row"}>
                        {/*inputValues*/}
                        <div>
                            {inputValues.map(socket => {
                                return (
                                    <div key={socket.id} className={"flow-node-socket"}>
                                        <label htmlFor={socket.id}>{socket.id}</label>
                                        <input id={`in-${socket.id}`} name={socket.id} onChange={onChangeParameter} defaultValue={props.data.values[socket.id]?.value} style={{display: props.data.linked && props.data.linked[socket.id] ? "none" : "block"}}/>
                                        <select id={`${socket.id}-typeDropDown`} onChange={onChangeType} defaultValue={props.data.types[props.data.values[socket.id]?.type]?.signature} style={{display: props.data.linked && props.data.linked[socket.id] ? "none" : "block"}}>
                                            {socket.types.map((type, index) => (
                                                <option key={index} value={type}>
                                                    {type}
                                                </option>
                                            ))}
                                        </select>
                                        <Handle type="target" position={Position.Left} id={socket.id} style={{left:-12}} />
                                    </div>
                                )})}
                        </div>

                        {/*outputValues*/}
                        <div>
                            {outputValues.map(socket => {
                                return (
                                    <div key={socket.id} className={"flow-node-socket"}>
                                        <label htmlFor={socket.id}>{socket.id}</label>
                                        <Handle type="source" position={Position.Right} id={socket.id} style={{right:-12}} />
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
