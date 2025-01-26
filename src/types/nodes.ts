import { IInteractivityDecleration, IInteractivityNode, IInteractivityValueType, InteractivityValueType } from "./InteractivityGraph";

export const knownNodes: IInteractivityDecleration[] = [
    {
       op: "event/onStart"
    },
    {
        op: "event/onTick"
    },
    {
        op: "flow/branch"
    },
    {
        op: "flow/for"
    },
    {
        op: "flow/sequence"
    }
]

export const standardTypes: IInteractivityValueType[] = [
    {
        name: "bool",
        signature: InteractivityValueType.BOOLEAN
    },
    {
        name: "int",
        signature: InteractivityValueType.INT
    },
    {
        name: "float",
        signature: InteractivityValueType.FLOAT
    },
    {
        name: "float2",
        signature: InteractivityValueType.FLOAT2
    },
    {
        name: "float3",
        signature: InteractivityValueType.FLOAT3
    },
    {
        name: "float4",
        signature: InteractivityValueType.FLOAT4
    },
    {
        name: "float4x4",
        signature: InteractivityValueType.FLOAT4X4
    },
    {
        name: "AMZN_interactivity_string",
        signature: InteractivityValueType.CUSTOM,
        extensions: {
            AMZN_interactivity_string: {}
        }
    }
]

const lifecycleNodeSpecs: IInteractivityNode[] = [
    {
        decleration: 0,
        description: "This node will fire when the session starts.",
        flows: {
            out: {
                out: {
                    node: undefined,
                    socket: undefined
                }
            }
        }
    },
    {
        decleration: 1,
        description: "This node will fire each tick.",
        flows: {
            out: {
                out: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            out: {
                timeSinceStart: {
                    typeOptions: [2],
                    type: 2,
                    description: "Relative time in seconds since the graph execution start",
                    value: [NaN]
                },
                timeSinceLastTick: {
                    typeOptions: [2],
                    type: 2,
                    description: "Relative time in seconds since the last tick occurred",
                    value: [NaN]
                }
            }
        }
    },
]

const flowNodeSpecs: IInteractivityNode[] = [
    {
        decleration: 2,
        description:"Branch the control flow based on a condition.",
        flows: {
            in: {
                in: {
                    node: undefined,
                    socket: undefined
                }
            },
            out: {
                true: {
                    node: undefined,
                    socket: undefined
                },
                false: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            in: {
                condition: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        decleration: 3,
        description: "Execute the subgraph for flow loopBody from startIndex to endIndex (exclusive), then execute the subgraph completed",
        configuration: {
            initialIndex: {
                value: [0]
            }
        },
        flows: {
            in: {
                in: {
                    node: undefined,
                    socket: undefined
                }
            },
            out: {
                loopBody: {
                    node: undefined,
                    socket: undefined
                },
                completed: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            in: {
                startIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                endIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        decleration: 4,
        description: "Takes in a single in flow and executes the out flows in order",
        flows: {
            in: {
                in: {
                    node: undefined,
                    socket: undefined
                }
            }
        }
    }
];

export const interactivityNodeSpecs = [...lifecycleNodeSpecs, ...flowNodeSpecs];