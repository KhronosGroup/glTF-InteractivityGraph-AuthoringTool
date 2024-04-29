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

export const pointerNodeSpecs: IAuthoringNode[] = [
    {
        type: "pointer/get",
        description: "Accesses properties of the gltf using JSON pointer",
        configuration: [
            {
                id: "pointer",
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
            values: [
                {
                    id: "val",
                    description: "The value to set",
                    types: ["bool", "int", "float", "float3", "float4"]
                },
                {
                    id: "isValid",
                    description: "a boolean flag which is true if the path requested is valid during runtime",
                    types: ["bool"]
                }
            ]
        }
    },
    {
        type: "pointer/set",
        description: "Sets properties of the gltf using JSON pointer immediately",
        configuration: [
            {
                id: "pointer",
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
                    id: "val",
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
                },
                {
                    id: "err",
                    description: "The flow to be followed if the input validation fails"
                }
            ],
            values:[]
        }
    },
    {
        type: "pointer/animateTo",
        description: "Sets properties of the gltf using JSON pointer over a set time",
        configuration: [
            {
                id: "pointer",
                description: "The template path to use in order to construct the json pointer",
                type: "string"
            },
            {
                id: "easingType",
                description: "The easing function to use 0 - Cubic Bezier, 1 - slerp",
                type: "int"
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
                    id: "easingDuration",
                    description: "The duration of the interpolation",
                    types: ["float"]
                },
                {
                    id: "val",
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
                  id: "done",
                  description: "The flow to follow once the animateTo is done"
                },
                {
                    id: "out",
                    description: "The out flow to be followed immediately after execution"
                },
                {
                    id: "err",
                    description: "The flow to be followed if the input validation fails"
                }
            ],
            values:[]
        }
    },
    {
        type: "world/startAnimation",
        description: "plays an animation",
        configuration: [],
        input: {
            values: [
                {
                    id: "animation",
                    types: ["int"],
                    description: "The index for the animation to play"
                },
                {
                    id: "speed",
                    types: ["float"],
                    description: "The speed multiplier of the animation, must be greater than zero/strictly positive, otherwise undefined (but you could in your implementation then default it to 1.0).  We specify backward playing using a negative targetTime."
                },
                {
                    id: "startTime",
                    types: ["float"],
                    description: "Start animation frame must be between the range of 0 to max animation time"
                },
                {
                    id: "endTime",
                    types: ["float"],
                    description: "End animation time, if it is before the start time the animation will be played backwards, if it is +/- Inf the animation will loop until manually stopped"
                }
            ],
            flows: [
                {
                    id: "in",
                    description: "in flow to trigger this node"
                }
            ]
        },
        output: {
            values: [],
            flows: [
                {
                    id: "out",
                    description: "The synchronous flow to be followed"
                },
                {
                    id: "done",
                    description: "The flow to be followed when the animation target time is reached, async"
                },
                {
                    id: "err",
                    description: "The flow to be followed if the input validation fails"
                }
            ]
        }
    },
    {
        type: "world/stopAnimation",
        description: "stops an animation instance",
        configuration: [
            {
                id: "stopMode",
                description: "0 - immediate, 1 - exactFrameTime",
                type: "int"
            }
        ],
        input: {
            values: [
                {
                    id: "animation",
                    types: ["int"],
                    description: "The animation to cancel"
                }
            ],
            flows: [
                {
                    id: "in",
                    description: "in flow to trigger this node"
                }
            ]
        },
        output: {
            values: [
                {
                    id: "time",
                    types:["float"],
                    description: "The interpolation of the time the animation was stopped at"
                }
            ],
            flows: [
                {
                    id: "out",
                    description: "The synchronous flow to be followed"
                },
                {
                    id: "done",
                    description: "The flow to be followed when the animation is canceled"
                },
                {
                    id: "err",
                    description: "The flow to be followed if the input validation fails"
                }
            ]
        }
    },
    {
        type: "ADBE/output_console_node",
        description: "Print out",
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
                    id: "message",
                    description: "First Argument",
                    types: [
                        "AMZN_interactivity_string"
                    ]
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
    }
]

export const typeConversionNodeSpecs: IAuthoringNode[] = [
    {
        type: "type/boolToInt",
        description: "Boolean to integer conversion",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "bool",
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "1 if a; else 0",
                    types: [
                        "int"
                    ]
                }
            ]
        }
    },
    {
        type: "type/boolToFloat",
        description: "Boolean to float conversion",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "bool",
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "1 if a; else 0",
                    types: [
                        "float"
                    ]
                }
            ]
        }
    },
    {
        type: "type/intToBool",
        description: "Integer to boolean conversion",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "int",
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "True if a is not 0; else false",
                    types: [
                        "bool"
                    ]
                }
            ]
        }
    },
    {
        type: "type/intToFloat",
        description: "Integer to float conversion",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "int",
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Floating point value equal to a",
                    types: [
                        "float"
                    ]
                }
            ]
        }
    },
    {
        type: "type/floatToBool",
        description: "Float to boolean conversion",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "float",
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "False if a is NaN or zero, else true",
                    types: [
                        "bool"
                    ]
                }
            ]
        }
    },
    {
        type: "type/floatToInt",
        description: "Float to int conversion",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "float",
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Integer point value equal to a",
                    types: [
                        "int"
                    ]
                }
            ]
        }
    },
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
        type:"node/OnSelect",
        description:"This node will fire when a node is selected.",
        configuration:[
            {
                id:"nodeIndex",
                type:"int",
                description:"The node to add the listener on"
            },
            {
                id:"stopPropagation",
                type:"bool",
                description:"Should the event be propagated up the node parent hierarchy"
            },
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
            values:[
                {
                    id: "hitNodeIndex",
                    description: "The index of the first hit node",
                    types: ["int"]
                },
                {
                    id: "localHitLocation",
                    description: "The local hit offset from the hit node's origin",
                    types: ["float3"]
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
        type: "flow/setDelay",
        description: "Schedule the output flow activation after a certain delay",
        configuration: [],
        input: {
            flows: [
                {
                    id: "in",
                    description: "The entry flow into this node.",
                },
                {
                    id: "cancel",
                    description: "When this flow is activated, all delayed activations scheduled by this node are cancelled",
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
                    id: "completed",
                    description: "The flow to be followed after the delay",
                },
                {
                    id: "out",
                    description: "The flow to be followed immediately after the node is executed"
                },
                {
                    id: "err",
                    description: "The flow to be followed if delay is an invalid value (negative, Nan, or +/-Inf)"
                }
            ],
            values: [
                {
                    id: "lastDelayIndex",
                    description: "The delay index assigned during the last successful node execution",
                    types: ["int"]
                }
            ]
        }
    },
    {
        type: "flow/cancelDelay",
        description: "Cancel a previously scheduled output flow activation",
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
                    id: "delayIndex",
                    types: ["int"],
                    description: "The index value of the scheduled activation to be cancelled"
                }
            ]
        },
        output: {
            flows: [
                {
                    id: "out",
                    description: "The flow to be followed immediately after the node is executed"
                }
            ],
            values: []
        }
    },
    {
        type: "flow/doN",
        description: "It will trigger its output the first N time(s) it is triggered, but subsequent triggers will do nothing until it is reset",
        configuration: [],
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
                },
                {
                    id: "err",
                    description: "The flow to be followed if delay is an invalid value (negative, Nan, or +/-Inf)"
                }
            ],
            values: [
                {
                    id: "lastRemainingTime",
                    types: ["float"],
                    description: "The remaining throttling time, in seconds, at the moment of the last valid activation of the input flow or NaN if the input flow has never been activated with a valid duration input value"
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
        type: "flow/for",
        description: "Execute the subgraph for flow loopBody from startIndex to endIndex (exclusive), then execute the subgraph completed",
        configuration: [
            {
                id: "initialIndex",
                type: "int",
                description: "The current index to be used if the for loop has not executed"
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
                    id: "startIndex",
                    types: ["int"],
                    description: "The start index of the for loop."
                },
                {
                    id: "endIndex",
                    types: ["int"],
                    description: "The end index of the for loop."
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
                id: "isRandom",
                type: "bool",
                description: "If set to true, out flows are executed in random order, picks random unused output flows each time until all are done"
            },
            {
                id: "loop",
                type: "bool",
                description: "If set to true, the outputs will repeat in a loop continuously and reset random seed and list of unused nodes to be all output flows, if false once all gates have been triggered then the node becomes unresponsive."
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
                    id: "lastIndex",
                    types: ["int"],
                    description: "The index of the last used output; -1 if the node has not been activated"
                }
            ]
        }
    },
    {
        type: "flow/sequence",
        description: "Takes in a single in flow and executes the out flows in order",
        configuration: [],
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
                id: "inputFlows",
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
                    description: "The flow to follow after a non completed firing"
                },
                {
                    id: "completed",
                    description: "The flow to be followed when all input flows are fired."
                }
            ],
            values: [
                {
                    id: "remainingInputs",
                    types: ["int"],
                    description: "The number of remaining inputs"
                }
            ]
        }
    },
    {
        type: "flow/while",
        description: "Execute the subgraph for flow loopBody while the condition is true, then execute the subgraph completed",
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
        type: "math/inf",
        description: "Infinity",
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
                    description: "Infinity",
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
    },
    {
        type: "math/nan",
        description: "Not a number",
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
                    description: "Not a number",
                    types: ["float"]
                }
            ]
        }
    }
]

export const arithmeticNodes = [
    {
        type: "math/cast",
        description: "Cast operation",
        configuration: [
            {
                id: "castType",
                description: "The string type name of what to cast to",
                type: "string"
            },
        ],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Addend",
                    types: [
                        "float",
                        "int",
                        "bool",
                        "float3",
                        "float4",
                        "float4x4"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "cast",
                    types: [
                        "float",
                        "int",
                        "bool"
                    ]
                }
            ]
        }
    },
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
                        "int",
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
                        "int",
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
                        "int",
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
                        "int",
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
                        "int",
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
                        "int",
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
                        "int",
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second Addend",
                    types: [
                        "int",
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
                        "int",
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
                        "int",
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Subtrahend",
                    types: [
                        "int",
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
                        "int",
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
                        "int",
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second factor",
                    types: [
                        "int",
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
                        "int",
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
                        "int",
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Divisor",
                    types: [
                        "int",
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
                        "int",
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
                        "int",
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Divisor",
                    types: [
                        "int",
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
                        "int",
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
                        "int",
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second Arg",
                    types: [
                        "int",
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
                        "int",
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
                        "int",
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second Arg",
                    types: [
                        "int",
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
                        "int",
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
                        "int",
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Lower Boundary",
                    types: [
                        "int",
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "c",
                    description: "Upper Boundary",
                    types: [
                        "int",
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
                        "int",
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

export const combine = [
    {
        type: "math/combine2",
        description: "Combine two floats into a two-component vector",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First component",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "b",
                    description: "Second component",
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
                    description: "vector 2",
                    types: [
                        "float2"
                    ]
                }
            ]
        }
    },
    {
        type: "math/combine3",
        description: "Combine three floats into a three-component vector",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First component",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "b",
                    description: "Second component",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "c",
                    description: "Third component",
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
                    description: "vector 3",
                    types: [
                        "float3"
                    ]
                }
            ]
        }
    },
    {
        type: "math/combine4",
        description: "Combine four floats into a three-component vector",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First component",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "b",
                    description: "Second component",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "c",
                    description: "Third component",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "d",
                    description: "Fourth component",
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
                    description: "vector 4",
                    types: [
                        "float4"
                    ]
                }
            ]
        }
    },
    {
        type: "math/combine4x4",
        description: "Combine 16 floats into a 4x4 matrix",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First row, first column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "b",
                    description: "Second row, first column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "c",
                    description: "Third row, first column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "d",
                    description: "Fourth row, first column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "e",
                    description: "First row, second column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "f",
                    description: "Second row, second column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "g",
                    description: "Third row, second column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "h",
                    description: "Fourth row, second column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "i",
                    description: "First row, third column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "j",
                    description: "Second row, third column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "k",
                    description: "Third row, third column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "l",
                    description: "Fourth row, third column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "m",
                    description: "First row, fourth column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "n",
                    description: "Second row, fourth column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "o",
                    description: "Third row, fourth column element",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "p",
                    description: "Fourth row, fourth column element",
                    types: [
                        "float"
                    ]
                },
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "matrix",
                    types: [
                        "float4x4"
                    ]
                }
            ]
        }
    }
];

export const extract = [
    {
        type: "math/extract2",
        description: "Extract two floats from a two-component vector",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First component",
                    types: [
                        "float2"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "0",
                    description: "First component",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "1",
                    description: "Second component",
                    types: [
                        "float"
                    ]
                },
            ]
        }
    },
    {
        type: "math/extract3",
        description: "Extract three floats from a three-component vector",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First component",
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
                    id: "0",
                    description: "First component",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "1",
                    description: "Second component",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "2",
                    description: "Third component",
                    types: [
                        "float"
                    ]
                }
            ]
        }
    },
    {
        type: "math/extract4",
        description: "Extract three floats from a three-component vector",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First component",
                    types: [
                        "float4"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "0",
                    description: "First component",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "1",
                    description: "Second component",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "2",
                    description: "Third component",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "3",
                    description: "Fourth component",
                    types: [
                        "float"
                    ]
                }
            ]
        }
    },
    {
        type: "math/extract4x4",
        description: "Extract 16 floats from a 4x4 matrix",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Matrix",
                    types: [
                        "float4x4"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "0",
                    description: "First row, first column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "1",
                    description: "Second row, first column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "2",
                    description: "Third row, first column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "3",
                    description: "Fourth row, first column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "4",
                    description: "First row, second column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "5",
                    description: "Second row, second column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "6",
                    description: "Third row, second column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "7",
                    description: "Fourth row, second column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "8",
                    description: "First row, third column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "9",
                    description: "Second row, third column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "10",
                    description: "Third row, third column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "11",
                    description: "Fourth row, third column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "12",
                    description: "First row, fourth column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "13",
                    description: "Second row, fourth column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "14",
                    description: "Third row, fourth column",
                    types: [
                        "float"
                    ]
                },
                {
                    id: "15",
                    description: "Fourth row, fourth column",
                    types: [
                        "float"
                    ]
                }
            ]
        }
    }
];

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
        type: "math/transform",
        description: "Vector transformation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Vector to transform",
                    types: [
                        "float4"
                    ]
                },
                {
                    id: "b",
                    description: "Transformation matrix",
                    types: [
                        "float4x4"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Transformed vector",
                    types: [
                        "float4"
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

export const matrixNodeSpecs = [
    {
        type: "math/transpose",
        description: "Transpose operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Matrix to transpose",
                    types: [
                        "float4x4"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Matrix that is the transpose of a",
                    types: [
                        "float4x4"
                    ]
                }
            ]
        }
    },
    {
        type: "math/inverse",
        description: "The matrix inverse",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Input Matrix",
                    types: [
                        "float4x4"
                    ]
                },
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Output Matrix",
                    types: [
                        "float4x4"
                    ]
                }
            ]
        }
    },
    {
        type: "math/determinant",
        description: "Determinant operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Matrix",
                    types: [
                        "float4x4"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Determinant of a",
                    types: [
                        "float"
                    ]
                }
            ]
        }
    },
    //TODO: find numerically stable way to compute without library
    // {
    //     type: "math/inverse",
    //     description: "Inverse operation",
    //     configuration: [],
    //     input: {
    //         flows: [],
    //         values: [
    //             {
    //                 id: "a",
    //                 description: "Matrix",
    //                 types: [
    //                     "float4x4"
    //                 ]
    //             }
    //         ]
    //     },
    //     output: {
    //         flows: [],
    //         values: [
    //             {
    //                 id: "val",
    //                 description: "Inverse of a",
    //                 types: [
    //                     "float4x4"
    //                 ]
    //             }
    //         ]
    //     }
    // },
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
    },
    {
        type: "math/select",
        description: "Conditional selection operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "condition",
                    description: "Value selecting the value returned",
                    types: [
                        "bool"
                    ]
                },
                {
                    id: "a",
                    description: "positive selection option",
                    types: [
                        "bool",
                        "int",
                        "float",
                        "float2",
                        "float3",
                        "float4",
                        "float4x4",
                        "AMZN_interactivity_string"
                    ]
                },
                {
                    id: "b",
                    description: "negative selection option",
                    types: [
                        "bool",
                        "int",
                        "float",
                        "float2",
                        "float3",
                        "float4",
                        "float4x4",
                        "AMZN_interactivity_string"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a if true, b if false",
                    types: [
                        "bool",
                        "int",
                        "float",
                        "float2",
                        "float3",
                        "float4",
                        "float4x4",
                        "AMZN_interactivity_string"
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
                        "bool",
                        "int",
                        "float",
                        "float3"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "bool",
                        "int",
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
                        "int",
                        "float"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "int",
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
                        "int",
                        "float"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "int",
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
                        "int",
                        "float"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "int",
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
                        "int",
                        "float"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "int",
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

export const bitwiseNodeSpecs = [
    {
        type: "math/not",
        description: "NOT operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Argument",
                    types: [
                        "bool",
                        "int"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "NOT a",
                    types: [
                        "bool",
                        "int"
                    ]
                }
            ]
        }
    },
    {
        type: "math/and",
        description: "AND operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Argument",
                    types: [
                        "bool",
                        "int"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "bool",
                        "int"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a AND b",
                    types: [
                        "bool",
                        "int"
                    ]
                }
            ]
        }
    },
    {
        type: "math/or",
        description: "OR operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Argument",
                    types: [
                        "bool",
                        "int"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "bool",
                        "int"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a OR b",
                    types: [
                        "bool",
                        "int"
                    ]
                }
            ]
        }
    },
    {
        type: "math/xor",
        description: "XOR operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "First Argument",
                    types: [
                        "bool",
                        "int"
                    ]
                },
                {
                    id: "b",
                    description: "Second Argument",
                    types: [
                        "bool",
                        "int"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a XOR b",
                    types: [
                        "bool",
                        "int"
                    ]
                }
            ]
        }
    },
    {
        type: "math/asr",
        description: "Right Shift",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Value to be shifted",
                    types: [
                        "int"
                    ]
                },
                {
                    id: "b",
                    description: "Num bits to shift",
                    types: [
                        "int"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a >> b",
                    types: [
                        "int"
                    ]
                }
            ]
        }
    },
    {
        type: "math/lsl",
        description: "Left Shift",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Value to be shifted",
                    types: [
                        "int"
                    ]
                },
                {
                    id: "b",
                    description: "Num bits to shift",
                    types: [
                        "int"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "a << b",
                    types: [
                        "int"
                    ]
                }
            ]
        }
    },
    {
        type: "math/clz",
        description: "Count leading zeros",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "int"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "number of leading zero bits",
                    types: [
                        "int"
                    ]
                }
            ]
        }
    },
    {
        type: "math/ctz",
        description: "Count trailing zeros",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "int"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "Number of trailing zero bits",
                    types: [
                        "int"
                    ]
                }
            ]
        }
    },
    {
        type: "math/popcnt",
        description: "Count set bits operation",
        configuration: [],
        input: {
            flows: [],
            values: [
                {
                    id: "a",
                    description: "Argument",
                    types: [
                        "int"
                    ]
                }
            ]
        },
        output: {
            flows: [],
            values: [
                {
                    id: "val",
                    description: "number of set bits",
                    types: [
                        "int"
                    ]
                }
            ]
        }
    }
]

export const authoringNodeSpecs: IAuthoringNode[] = [...pointerNodeSpecs, ...flowNodeSpecs, ...lifecycleNodeSpecs, ...customEventNodeSpecs, ...variableNodeSpecs,
    ...constantsNodes, ...arithmeticNodes, ...trigNodes, ...hyperbolicNodes, ...exponentialFunctionNodes, ...experimentalNodeSpecs, ...vectorNodes,
    ...specialFloatingPointNodeSpecs, ...matrixNodeSpecs, ...comparisonNodeSpecs, ...bitwiseNodeSpecs, ...typeConversionNodeSpecs, ...combine, ];
