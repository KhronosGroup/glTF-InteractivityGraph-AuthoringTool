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

        if (props.data.configuration.numberOutputFlows !== undefined) {
            const numberOutputFlows = Number(props.data.configuration.numberOutputFlows);
            const outputFlows = [];
            for (let i = 0; i < numberOutputFlows; i++) {
                const outputFlow: IFlowSocketDescriptor = {
                    id: `${i}`,
                    description: `The ${i} outflow of this node`
                }
                outputFlows.push(outputFlow);
            }
            outputFlows.push(...nodeSpec.output.flows);
            setOutputFlows(outputFlows);
        } else if (props.data.configuration.numberInputFlows !== undefined) {
            const numberInputFlows = Number(props.data.configuration.numberInputFlows);
            const inputFlows = [];
            for (let i = 0; i < numberInputFlows; i++) {
                const inputFlow: IFlowSocketDescriptor = {
                    id: `${i}`,
                    description: `The ${i} inflow of this node`
                }
                inputFlows.push(inputFlow);
            }
            inputFlows.push(...nodeSpec.input.flows);
            setInputFlows(inputFlows);
        } else if (props.data.configuration.cases !== undefined) {
            const cases: number[] = JSON.parse(props.data.configuration.cases);
            const outputFlows = [];
            for (let i = 0; i < cases.length; i++) {
                const outputFlow: IFlowSocketDescriptor = {
                    id: `${cases[i]}`,
                    description: `The outflow of this node for case ${cases[i]}`
                }
                outputFlows.push(outputFlow);
            }
            outputFlows.push(...nodeSpec.output.flows);
            setOutputFlows(outputFlows);
        } else if (props.data.configuration.customEvent !== undefined) {
            const customEventId: number = JSON.parse(props.data.configuration.customEvent);
            const ce: ICustomEvent = props.data.customEvents[customEventId];

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

            if (props.node.type === "customEvent/send") {
                setInputValues(values);
            } else if (props.node.type === "customEvent/receive") {
                setOutputValues(values);
            }
        } else if (props.data.configuration.path !== undefined) {
            const vals = parsePath(props.data.configuration.path)
            const inputValues: IValueSocketDescriptor[] = [];
            for (let i = 0; i < vals.length; i++) {
                const value: IValueSocketDescriptor = {id: vals[i], types: ["int"], description: `Value for ${vals[i]}`}
                inputValues.push(value);
            }

            if (props.node.type === "world/set" || props.node.type === "world/animateTo") {
                setInputValues([...inputValues, {id: "a", types: ["bool", "int", "float", "float3", "float4"], description: "Target value to set"}]);
            } else if (props.node.type === "world/get") {
                setInputValues(inputValues);
                setOutputValues([...outputValues, {id: "value", types: ["bool", "int", "float", "float3", "float4"], description: "Output value of getting"}])
            }
        } else if (props.data.configuration.variable !== undefined) {
            const variableId: number = JSON.parse(props.data.configuration.variable);
            const v: IVariable = props.data.variables[variableId];
            const value: IValueSocketDescriptor = {id: v.id, types: [props.data.types[v.type].signature], value: v.value, description: 'Value Socket for this variable'}

            if (props.node.type === "variable/set") {
                setInputValues([value]);
            } else if (props.node.type === "variable/get") {
                setOutputValues([value]);
            }
        } else if (props.data.configuration.stopMode !== undefined) {
            if (props.data.configuration.stopMode === "1") {
                setInputValues([{id: "animation", types:["int"], description: "animation top stop"}, {id: "stopTime", types: ["float"], description: "Target time to stop at"}]);
            } else {
                setInputValues([{id: "animation", types:["int"], description: "animation top stop"}]);
            }

        }
    }

    const getHeaderColor = (name:string) => {
        const category = name.split("/")[0];
        switch (category) {
            case "flow":
                return "#b18cd9"
            case "lifecycle":
                return "#f8a848"
            case "math":
                return "#baf691"
            case "world":
                return "#7ddede"
            case "customEvent":
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
