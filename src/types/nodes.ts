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
    },
    {
        op: "variable/set"
    },
    {
        op: "variable/get"
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

const variableNodeSpecs: IInteractivityNode[] = [
    {
        decleration: 5,
        description: "Set a variable to a value",
        configuration: {
            variable: {
                value: [undefined],
            }
        },
        flows: {
            input: { 
                in: {
                    node: undefined,
                    socket: undefined
                }
            },
            output: {
                out: {
                    node: undefined,
                    socket: undefined
                }
            }
        }
    },
    {
        decleration: 6,
        description: "Get a variable's value",
        configuration: {
            variable: {
                value: [undefined]
            }
        }
    }
]

const lifecycleNodeSpecs: IInteractivityNode[] = [
    {
        decleration: 0,
        description: "This node will fire when the session starts.",
        flows: {
            output: {
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
            output: {
                out: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            output: {
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
            input: {
                in: {
                    node: undefined,
                    socket: undefined
                }
            },
            output: {
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
            input: {
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
            input: {
                in: {
                    node: undefined,
                    socket: undefined
                }
            },
            output: {
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
            input: {
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
            input: {
                in: {
                    node: undefined,
                    socket: undefined
                }
            }
        }
    }
];

export const interactivityNodeSpecs = [...lifecycleNodeSpecs, ...flowNodeSpecs, ...variableNodeSpecs];