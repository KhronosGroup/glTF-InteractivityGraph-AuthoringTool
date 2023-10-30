export interface ISchemaValueDescriptor {
    id: string,
    description: string
}

export interface IConfigDescriptor extends ISchemaValueDescriptor {
    type: string
    value?: any
}

export interface IFlowSocketDescriptor extends ISchemaValueDescriptor{
    socket?: string
    node?: number
}

export interface IValueSocketDescriptor extends ISchemaValueDescriptor {
    types: string[]
    value?: any
    socket?: string
    node?: number
}

export interface ICustomEventValueDescriptor extends ISchemaValueDescriptor {
    type: number,
    value?: any
}

export interface IAuthoringNode {
    type: string,
    description: string
    configuration: IConfigDescriptor[],
    input: {
        flows: IFlowSocketDescriptor[],
        values: IValueSocketDescriptor[]
    },
    output: {
        flows: IFlowSocketDescriptor[],
        values: IValueSocketDescriptor[]
    }
}


export interface ICustomEvent {
    id: string,
    values?: ICustomEventValueDescriptor[],
}

export interface IVariable {
    id: string,
    value?: any,
    type: number
}

export const standardTypes = [
    {signature: "bool"},
    {signature: "int"},
    {signature: "float"},
    {signature: "float2"},
    {signature: "float3"},
    {signature: "float4"},
    {signature: "float4x4"},
    {
        signature: "custom",
        extensions: {
            AMZN_interactivity_string: {}
        }
    }
]

export const worldNodeSpecs: IAuthoringNode[] = [
    {
        type: "world/get",
        description: "Accesses properties of the gltf using JSON pointer",
        configuration: [
            {
                id: "path",
                description: "The template path to use in order to construct the json pointer",
                type: "string"
            }
        ],
        input: {
            flows: [],
            values: []

        },
        output: {
            flows: [],
            values: []
        }
    },
    {
        type: "world/set",
        description: "Sets properties of the gltf using JSON pointer immediately",
        configuration: [
            {
                id: "path",
                description: "The template path to use in order to construct the json pointer",
                type: "string"
            }
        ],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The in flow"
                }
            ],
            values: [
                {
                    id: "a",
                    description: "The value to set",
                    types: ["bool", "int", "float", "float3", "float4"]
                }
            ]
        },
        output: {
            flows: [
                {
                    id: "out",
                    description: "The out flow"
                }
            ],
            values:[]
        }
    },
    {
        type: "world/animateTo",
        description: "Sets properties of the gltf using JSON pointer over a set time",
        configuration: [
            {
                id: "path",
                description: "The template path to use in order to construct the json pointer",
                type: "string"
            },
            {
                id: "easingType",
                description: "The easing function to use",
                type: "string"
            },
            {
                id: "easingDuration",
                description: "The duration of the interpolation",
                type: "float"
            }
        ],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The in flow"
                }
            ],
            values: [
                {
                    id: "a",
                    types: [
                        "int",
                        "float",
                        "float3",
                        "float4"
                    ],
                    description: "Target value to set"
                }
            ]
        },
        output: {
            flows: [
                {
                    id: "out",
                    description: "The out flow"
                }
            ],
            values:[]
        }
    }
]

export const variableNodeSpecs: IAuthoringNode[] = [
    {
        type: "variable/get",
        description: "Used to get the value of a variable",
        configuration: [
            {
                id: "variable",
                description: "The index of the variable to be accessed",
                type: "int"
            }
        ],
        input: {
            flows: [],
            values: []
        },
        output: {
            flows: [],
            values: []
        }
    },
    {
        type: "variable/set",
        description: "Used to set the value of a variable",
        configuration: [
            {
                id: "variable",
                description: "The index of the variable to be accessed",
                type: "int"
            }
        ],
        input: {
            flows: [
                {
                    id:"in",
                    description:"Causes the variable set to be triggered."
                }
            ],
            values: []
        },
        output: {
            flows: [
                {
                    id:"out",
                    description:"The flow to be followed when the node is fired."
                }
            ],
            values: []
        }
    }
]

export const experimentalNodeSpecs: IAuthoringNode[] = [
    {
        type: "math/random",
        description: "Random float",
        configuration: [],
        input: {
            flows: [],
            values: []
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Random float",
                    types: ["float"]
                }
            ]
        }
    },
    {
        type: "math/lessThan",
        description: "return true if a < b",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First val",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second val",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a < b",
                    types: [
                        "bool"
                    ]
                }
            ]
        }
    }
]

export const customEventNodeSpecs: IAuthoringNode[] = [
    {
        type: "customEvent/send",
        description: "Used to send custom events that may be consumed elsewhere in the graph or by the engines itself.",
        configuration:[
            {
                id:"customEvent",
                type:"int",
                description:"Identifies the custom event by an index into the CustomEvents list."
            }
        ],
        input:{
            flows:[
                {
                    id:"in",
                    description:"Causes the custom event to be triggered."
                }
            ],
            values:[]
        },
        output:{
            flows:[],
            values:[]
        }
    },
    {
        type:"customEvent/receive",
        description:"This node will fire when a custom event occurs.",
        configuration:[
            {
                id:"customEvent",
                type:"int",
                description:"Identifies the custom event by an index into the CustomEvents list."
            }
        ],
        input:{
            flows:[],
            values:[]
        },
        output:{
            flows:[
                {
                    id:"out",
                    description:"The flow to be followed when the custom event is fired."
                }
            ],
            values:[]
        }
    }
]

export const lifecycleNodeSpecs: IAuthoringNode[] = [
    {
        type: "lifecycle/onStart",
        description: "This node will fire when the session starts.",
        configuration: [],
        input: {
            flows: [],
            values: []
        },
        output: {
            flows: [
                {
                    id: "out",
                    description: "The flow to be followed when the session starts."
                }
            ],
            values: []
        }
    },
    {
        type: "lifecycle/onTick",
        description: "This node will fire each tick.",
        configuration: [],
        input: {
            flows: [],
            values: []
        },
        output: {
            flows: [
                {
                    id: "out",
                    description: "The flow to be followed when a tick occurs."
                }
            ],
            values: []
        }
    },
]

export const flowNodeSpecs: IAuthoringNode[] = [
    {
        type: "flow/branch",
        description:"Branch the control flow based on a condition.",
        configuration:[],
        input :{
            flows:[
                {
                    id:"in",
                    description:"The entry flow into this node.",
                }
            ],
            values:[
                {
                    id:"condition",
                    types:["bool"],
                    description:"The boolean value which is used to evaluate the branch taken."
                }
            ]
        },
        output:{
            flows:[
                {
                    id:"true",
                    description:"The flow to be followed if the condition is true.",
                },
                {
                    id:"false",
                    description:"The flow to be followed if the condition is false.",
                }
            ],
            values:[

            ]
        }
    },
    {
        type: "flow/delay",
        description: "Continue graph execution after a delay (in seconds). It will not respond to any other triggers during that delay",
        configuration: [],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The entry flow into this node.",
                }
            ],
            values: [
                {
                    id: "duration",
                    types: ["float"],
                    description: "The duration in seconds to delay"
                }
            ]
        },
        output: {
            flows: [
                {
                    id: "out",
                    description: "The flow to be followed after the delay",
                }
            ],
            values: []
        }
    },
    {
        type: "flow/doN",
        description: "It will trigger its output the first N time(s) it is triggered, but subsequent triggers will do nothing until it is reset",
        configuration: [
            {
                id: "startCount",
                type: "int",
                description: "Indicates what the currentCount should be set to on node instantiation"
            }
        ],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The entry flow into this node."
                },
                {
                    id: "reset",
                    description: "When this flow is activated, the node's currentCount is reset to 0"
                }
            ],
            values: [
                {
                    id: "n",
                    types: ["int"],
                    description: "Sets the number of times this DoN node will trigger before needing to be reset."
                }
            ]
        },
        output: {
            flows: [
                {
                    id: "out",
                    description: "The flow to be followed after the input flow 'in' is activated"
                }
            ],
            values: [
                {
                    id: "currentCount",
                    types: ["int"],
                    description: "The current number of times this node has been fired since it was last reset."
                }
            ]
        }
    },
    {
        type: "flow/flipFlop",
        description: "Each time it is triggered, it will fire either its a or b output subsequently",
        configuration: [],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The entry flow into this node.",
                },
                {
                    id: "reset",
                    description: "When this flow is activated, the node state is to have flow a be the active one",
                }
            ],
            values: []
        },
        output: {
            flows: [
                {
                    id: "a",
                    description: "The flow to be followed if the current node state is a",
                },
                {
                    id: "b",
                    description: "The flow to be followed if the current node state is b",
                }
            ],
            values: [
                {
                    id: "isA",
                    types: ["bool"],
                    description: "Indicates whether flow a will be triggered (if true) or flow b will be triggered (if false)"
                }
            ]
        }
    },
    {
        type: "flow/throttle",
        description: "This node will fire when activated unless it has been triggered < delay amount ago, in which case it will set its isThrottling state to true and do nothing.",
        configuration: [],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The entry flow into this node."
                },
                {
                    id: "reset",
                    description: "Triggering this flow sets the nodes, timeRemaining to 0, allowing it to be invoked again without throttling"
                }
            ],
            values: [
                {
                    id: "duration",
                    types: ["float"],
                    description: "The seconds to wait between executing"
                }
            ]
        },
        output: {
            flows: [
                {
                    id: "out",
                    description: "The flow to be followed"
                }
            ],
            values: [
                {
                    id: "timeRemaining",
                    types: ["float"],
                    description: "Indicates whether the node is throttling"
                }
            ]
        }
    },
    {
        type: "flow/cycle",
        description: "Each time it is triggered, it will fire the next output flow. Once it fires the last one, it will return to index 0.",
        configuration: [
            {
                id: "numberOutputFlows",
                type: "int",
                description: "Sets the number of outputs of this node."
            }
        ],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The entry flow into this node."
                },
                {
                    id: "reset",
                    description: "When this flow is activated, the node state is such that the currentIndex is 0"
                }
            ],
            values: []
        },
        output: {
            flows: [],
            values: [
                {
                    id: "currentIndex",
                    types: ["int"],
                    description: "The index of the next output flow to be fired"
                }
            ]
        }
    },
    {
        type: "flow/forLoop",
        description: "Execute the subgraph for flow loopBody from startIndex to endIndex (inclusive), then execute the subgraph completed",
        configuration: [],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The entry flow into this node."
                }
            ],
            values: [
                {
                    id: "startIndex",
                    types: ["int"],
                    description: "The start index of the for loop."
                },
                {
                    id: "endIndex",
                    types: ["int"],
                    description: "The end index of the for loop."
                },
                {
                    id: "increment",
                    types: ["int"],
                    description: "The amount to increment index each iteration."
                }
            ]
        },
        output: {
            flows: [
                {
                    id: "loopBody",
                    description: "The flow to be followed if index < endIndex.",
                },
                {
                    id: "completed",
                    description: "The flow to be followed if index >= endIndex.",
                }
            ],
            values: [
                {
                    id: "index",
                    types: ["int"],
                    description: "The value of the current index in the for loop execution"
                }
            ]
        }
    },
    {
        type: "flow/gate",
        description: "Execute the flow graph for completed if the gate state is open",
        configuration: [
            {
                id: "startClosed",
                type: "bool",
                description: "Sets the starting state of the node to closed or open"
            }
        ],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The entry flow into this node."
                },
                {
                    id: "open",
                    description: "Triggering this socket sets the node state to open"
                },
                {
                    id: "close",
                    description: "Triggering this socket sets the node state to close"
                },
                {
                    id: "toggle",
                    description: "Triggering this socket sets the node state to toggle (between open and close)"
                }
            ],
            values: []
        },
        output: {
            flows: [
                {
                    id: "out",
                    description: "The flow to be followed if the gate is open"
                }
            ],
            values: [
                {
                    id: "isOpen",
                    types: ["bool"],
                    description: "Indicates whether the gate is currently open or not"
                }
            ]
        }
    },
    {
        type: "flow/multiGate",
        description: "Takes in a single in flow and routes it to any number of potential outputs. Sequentially or at random. It may or may not loop.",
        configuration: [
            {
                id: "numberOutputFlows",
                type: "int",
                description: "Sets the number of outputs of this node."
            },
            {
                id: "isRandom",
                type: "bool",
                description: "If set to true, out flows are executed in random order, picks random unused output flows each time until all are done"
            },
            {
                id: "loop",
                type: "bool",
                description: "If set to true, the outputs will repeat in a loop continuously and reset random seed and list of unused nodes to be all output flows, if false once all gates have been triggered then the node becomes unresponsive."
            },
            {
                id: "startIndex",
                type: "int",
                description: "The output flow to start at, (setting to -1 is equivalent to not setting)."
            }
        ],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The entry flow into this node."
                },
                {
                    id: "reset",
                    description: "Triggering this socket resets the node's index to startIndex, resets the random seed and sets the list of unused nodes to be all the output flows"
                }
            ],
            values: []
        },
        output: {
            flows: [],
            values: [
                {
                    id: "currentIndex",
                    types: ["int"],
                    description: "The index of the current open gate (-1 if no open gate)"
                }
            ]
        }
    },
    {
        type: "flow/sequence",
        description: "Takes in a single in flow and executes the out flows in order",
        configuration: [
            {
                id: "numberOutputFlows",
                type: "int",
                description: "Sets the number of outputs of this node."
            }
        ],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The entry flow into this node."
                }
            ],
            values: []
        },
        output: {
            flows: [],
            values: []
        }
    },
    {
        type: "flow/switch",
        description: "Reads the selection input and executes an output flow depending on the selection value",
        configuration: [
            {
                id: "cases",
                type: "int[]",
                description: "The cases on which to perform the switch on."
            }
        ],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The entry flow into this node."
                }
            ],
            values: [
                {
                    id: "selection",
                    types: ["int"],
                    description: "The value on which the switch operates."
                }
            ]
        },
        output: {
            flows: [
                {
                    id: "default",
                    description: "The flow to be followed if none of the cases are matched"
                }
            ],
            values: []
        }
    },
    {
        type: "flow/waitAll",
        description: "Execute the flow graph when all input flows are fired at least once.",
        configuration: [
            {
                id: "numberInputFlows",
                type: "int",
                description: "Sets the number of inputs to wait on."
            }
        ],
        input: {
            flows: [
                {
                    id: "reset",
                    description: "Triggering this socket resets the node's state to the point where no inputs have been fired"
                }
            ],
            values: []
        },
        output: {
            flows: [
                {
                    id: "out",
                    description: "The flow to be followed when all input flows are fired."
                }
            ],
            values: []
        }
    },
    {
        type: "flow/whileLoop",
        description: "Execute the subgraph for flow loopBody while the condition is true, then execute the subgraph completed",
        configuration: [
            {
                id: "isDo",
                type: "bool",
                description: "Indicates if the node should be executed before checking the condition each iteration (making this a do-while loop)"
            }
        ],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The entry flow into this node."
                }
            ],
            values: [
                {
                    id: "condition",
                    types: ["bool"],
                    description: "The bool value which is used to evaluate if the loop should continue."
                }
            ]
        },
        output: {
            flows: [
                {
                    id: "loopBody",
                    description: "The flow to be followed if the condition is true"
                },
                {
                    id: "completed",
                    description: "The flow to be followed if the condition is false"
                }
            ],
            values: []
        }
    }
]

export const constantsNodes = [
    {
        type: "math/e",
        description: "Euler’s number",
        configuration: [],
        input: {
            flows: [],
            values: []
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Euler's Number",
                    types: ["float"]
                }
            ]
        }
    },
    {
        type: "math/pi",
        description: "Ratio of a circle’s circumference to its diameter",
        configuration: [],
        input: {
            flows: [],
            values: []
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Ratio of a circle’s circumference to its diameter",
                    types: ["float"]
                }
            ]
        }
    }
]

export const arithmeticNodes = [
    {
        type: "math/abs",
        description: "Absolute value operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "if a > 0 then -a, else a",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/sign",
        description: "Sign operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "if a > 0 then -1, else 1",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/trunc",
        description: "Truncate operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Integer value equal to the nearest integer to a whose absolute value is not larger than the absolute value of a",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/floor",
        description: "Floor operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Value equal to the nearest integer that is less than or equal to a",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/ceil",
        description: "Ceil operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Value equal to the nearest integer that is greater than or equal to a",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/fract",
        description: "Fractional operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a - floor(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/neg",
        description: "Negation operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "-a",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/add",
        description: "Addition operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Addend",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second Addend",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a + b",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/sub",
        description: "Subtraction operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Minuend",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Subtrahend",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a - b",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/mul",
        description: "Multiplication operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First factor",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second factor",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a * b",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/div",
        description: "Division operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Dividend",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Divisor",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a / b",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/rem",
        description: "Remainder operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Dividend",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Divisor",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "remainder of a / b",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/min",
        description: "Minimum operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Arg",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second Arg",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "smallest of a and b",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/max",
        description: "Maximum operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Arg",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second Arg",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "largest of a and b",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/clamp",
        description: "Clamp operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Value to clamp",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Lower Boundary",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "c",
                    description: "Upper Boundary",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "min(max(a,b),c)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/saturate",
        description: "Saturate operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Value to saturate",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "clamp(a,0,1)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/mix",
        description: "Linear interpolation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Interpolated value at time 0.0",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Interpolated value at time 1.0",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "c",
                    description: "Unclamped interpolation coefficient",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "(1.0 - c) * a + c * b",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    }
]

export const trigNodes = [
    {
        type: "math/rad",
        description: "Convert degrees to radians",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Value in degrees",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a * pi / 180",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/deg",
        description: "Convert radians to degrees",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Value in radians",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a * 180 / pi",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/sin",
        description: "Sine function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Angle",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "sin(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/cos",
        description: "Cosine function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Angle",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "cos(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/tan",
        description: "Tangent function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Angle",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "tan(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/asin",
        description: "Arcsine function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Angle",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "arcsin(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/acos",
        description: "Arccosine function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Angle",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Arccos(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/atan",
        description: "Arctangent function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Angle",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "atan(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/atan2",
        description: "Arctangent 2 function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Angle",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "atan2(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
]

export const hyperbolicNodes = [
    {
        type: "math/sinh",
        description: "Hyperbolic sine function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Hyperbolic Angle",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "sinh(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/cosh",
        description: "Hyperbolic Cosine function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Hyperbolic Angle",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "cosh(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/tanh",
        description: "Hyperbolic Tangent function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Hyperbolic Angle",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "tanh(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/asinh",
        description: "Hyperbolic Arcsine function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Hyperbolic sine value",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "arcsinh(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/acosh",
        description: "Hyperbolic Arccosine function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Hyperbolic cosine value",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Arccosh(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/atanh",
        description: "Hyperbolic Arctangent function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Hyperbolic tangent value Angle",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "atanh(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    }
]

export const exponentialFunctionNodes = [
    {
        type: "math/pow",
        description: "Power function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Base",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Exponent",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "b^a",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/exp",
        description: "Power function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Exponent",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "e^a",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/log",
        description: "Logarithm function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument value",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "ln(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/log2",
        description: "Logarithm function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument value",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "log_2(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/log10",
        description: "Logarithm function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument value",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "log_10(a)",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/sqrt",
        description: "SquareRoot function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Radicand",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a root 2",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/cbrt",
        description: "CubeRoot function",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Radicand",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a root 3",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        }
    }
]

export const vectorNodes: IAuthoringNode[] = [
    {
        type: "math/length",
        description: "Vector Length",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Vector",
                    types: [
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Length of the vector",
                    types: [
                        "float"
                    ]
                }
            ]
        }
    },
    {
        type: "math/normalize",
        description: "Vector normalization",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Vector",
                    types: [
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Normalized Vector",
                    types: [
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/dot",
        description: "Dot Product",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Vector",
                    types: [
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second Vector",
                    types: [
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Dot product",
                    types: [
                        "float"
                    ]
                }
            ]
        }
    },
    {
        type: "math/cross",
        description: "Cross Product",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Vector",
                    types: [
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second Vector",
                    types: [
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Cross product",
                    types: [
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/rotate2D",
        description: "Vector Rotation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Vector to rotate",
                    types: [
                        "float2"
                    ]
                },
                {
                    id: "b",
                    description: "Angle in radians",
                    types: [
                        "float"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Rotated vector",
                    types: [
                        "float2"
                    ]
                }
            ]
        }
    },
    {
        type: "math/rotate3D",
        description: "Vector Rotation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Vector to rotate",
                    types: [
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Vector to rotate around",
                    types: [
                        "float3"
                    ]
                },
                {
                    id: "c",
                    description: "Angle in radians",
                    types: [
                        "float"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Rotated vector",
                    types: [
                        "float3"
                    ]
                }
            ]
        }
    }
]

export const specialFloatingPointNodeSpecs = [
    {
        type: "math/isnan",
        description: "Not a Number check operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "argument",
                    types: [
                        "float"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "True if NaN else false",
                    types: [
                        "bool"
                    ]
                }
            ]
        }
    },
    {
        type: "math/isinf",
        description: "infinity check",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "argument",
                    types: [
                        "float"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "True if a is +/- Inf, else false",
                    types: [
                        "bool"
                    ]
                }
            ]
        }
    }
]

export const comparisonNodeSpecs = [
    {
        type: "math/eq",
        description: "Equality operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Argument",
                    types: [
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "float",
                        "float3"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "True if equal else false",
                    types: [
                        "bool"
                    ]
                }
            ]
        }
    },
    {
        type: "math/lt",
        description: "Less than operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Argument",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "float"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "True if < else false",
                    types: [
                        "bool"
                    ]
                }
            ]
        }
    },
    {
        type: "math/le",
        description: "Less than or equal to operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Argument",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "float"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "True if <= else false",
                    types: [
                        "bool"
                    ]
                }
            ]
        }
    },
    {
        type: "math/gt",
        description: "Greater than operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Argument",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "float"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "True if > else false",
                    types: [
                        "bool"
                    ]
                }
            ]
        }
    },
    {
        type: "math/ge",
        description: "Greater than or equal to operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Argument",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "float"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "True if >= else false",
                    types: [
                        "bool"
                    ]
                }
            ]
        }
    },
]

export const authoringNodeSpecs: IAuthoringNode[] = [...worldNodeSpecs, ...flowNodeSpecs, ...lifecycleNodeSpecs, ...customEventNodeSpecs, ...variableNodeSpecs,
    ...constantsNodes, ...arithmeticNodes, ...trigNodes, ...hyperbolicNodes, ...exponentialFunctionNodes, ...experimentalNodeSpecs, ...vectorNodes,
    ...specialFloatingPointNodeSpecs];
