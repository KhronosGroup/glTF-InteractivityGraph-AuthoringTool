import { IInteractivityDeclaration, IInteractivityNode, IInteractivityValue, IInteractivityValueType, InteractivityValueType } from "./InteractivityGraph";

export const knownDeclarations: IInteractivityDeclaration[] = [
    {
        op: "debug/log"
    },
    {
        op: "math/E"
    },
    {
        op: "math/Pi"
    },
    {
        op: "math/Inf"
    },
    {
        op: "math/NaN"
    },
    {
        op: "math/abs"
    },
    {
        op: "math/sign"
    },
    {
        op: "math/trunc"
    },
    {
        op: "math/floor"
    },
    {
        op: "math/ceil"
    },
    {
        op: "math/round"
    },
    {
        op: "math/fract"
    },
    {
        op: "math/neg"
    },
    {
        op: "math/add"
    },
    {
        op: "math/sub"
    },
    {
        op: "math/mul"
    },
    {
        op: "math/div"
    },
    {
        op: "math/rem"
    },
    {
        op: "math/min"
    },
    {
        op: "math/max"
    },
    {
        op: "math/clamp"
    },
    {
        op: "math/saturate"
    },
    {
        op: "math/mix"
    },
    {
        op: "math/eq"
    },
    {
        op: "math/lt"
    },
    {
        op: "math/le"
    },
    {
        op: "math/gt"
    },
    {
        op: "math/ge"
    },
    {
        op: "math/isNaN"
    },
    {
        op: "math/isInf"
    },
    {
        op: "math/select"
    },
    {
        op: "math/switch"
    },
    {
        op: "math/random"
    },
    {
        op: "math/rad"
    },
    {
        op: "math/deg"
    },
    {
        op: "math/sin"
    },
    {
        op: "math/cos"
    },
    {
        op: "math/tan"
    },
    {
        op: "math/asin"
    },
    {
        op: "math/acos"
    },
    {
        op: "math/atan"
    },
    {
        op: "math/atan2"
    },
    {
        op: "math/sinh"
    },
    {
        op: "math/cosh"
    },
    {
        op: "math/tanh"
    },
    {
        op: "math/asinh"
    },
    {
        op: "math/acosh"
    },
    {
        op: "math/atanh"
    },
    {
        op: "math/exp"
    },
    {
        op: "math/log"
    },
    {
        op: "math/log2"
    },
    {
        op: "math/log10"
    },
    {
        op: "math/sqrt"
    },
    {
        op: "math/cbrt"
    },
    {
        op: "math/pow"
    },
    {
        op: "math/length"
    },
    {
        op: "math/normalize"
    },
    {
        op: "math/dot"
    },
    {
        op: "math/cross"
    },
    {
        op: "math/rotate2d"
    },
    {
        op: "math/rotate3d"
    },
    {
        op: "math/transform"
    },
    {
        op: "math/transpose"
    },
    {
        op: "math/determinant"
    },
    {
        op: "math/inverse"
    },
    {
        op: "math/matMul"
    },
    {
        op: "math/matCompose"
    },
    {
        op: "math/matDecompose"
    },
    {
        op: "math/combine2"
    },
    {
        op: "math/combine3"
    },
    {
        op: "math/combine4"
    },
    {
        op: "math/combine4x4"
    },
    {
        op: "math/combine2x2"
    },
    {
        op: "math/combine3x3"
    },
    {
        op: "math/extract2"
    },
    {
        op: "math/extract3"
    },
    {
        op: "math/extract4"
    },
    {
        op: "math/extract4x4"
    },
    {
        op: "math/extract2x2"
    },
    {
        op: "math/extract3x3"
    },
    {
        op: "math/not"
    },
    {
        op: "math/and"
    },
    {
        op: "math/or"
    },
    {
        op: "math/xor"
    },
    {
        op: "math/asr"
    },
    {
        op: "math/lsl"
    },
    {
        op: "math/clz"
    },
    {
        op: "math/ctz"
    },
    {
        op: "math/popcnt"
    },
    {
        op: "type/boolToInt"
    },
    {
        op: "type/boolToFloat"
    },
    {
        op: "type/intToBool"
    },
    {
        op: "type/intToFloat"
    },
    {
        op: "type/floatToInt"
    },
    {
        op: "type/floatToBool"
    },
    {
       op: "event/onStart"
    },
    {
        op: "event/onTick"
    },
    {
        op: "event/send"
    },
    {
        op: "event/receive"
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
        op: "flow/throttle"
    },
    {
        op: "flow/setDelay"
    },
    {
        op: "flow/cancelDelay"
    },
    {
        op: "flow/switch"
    },
    {
        op: "flow/while"
    },
    {
        op: "flow/doN"
    },
    {
        op: "flow/multiGate"
    },
    {
        op: "flow/waitAll"
    },
    {
        op: "variable/set"
    },
    {
        op: "variable/get"
    },
    {
        op: "variable/interpolate"
    },
    {
        op: "pointer/set"
    },
    {
        op: "pointer/get"
    },
    {
        op: "pointer/interpolate"
    },
    {
        op: "animation/start"
    },
    {
        op: "animation/stop"
    },
    {
        op: "animation/stopAt"
    },
    {
        op: "event/onSelect",
        extension: "KHR_node_selectability",
        outputValueSockets: {
            selectedNodeIndex: {
                type: 1,
                value: [undefined]
            },
            controllerIndex: {
                type: 1,
                value: [undefined]
            },
            selectionPoint: {
                type: 4,
                value: [undefined]
            },
            selectionRayOrigin: {
                type: 4,
                value: [undefined]
            }
        }
    },
    {
        op: "ADBE/output_console_node",
        extension: "ADBE_output_console_node",
        inputValueSockets: {
            message: {
                type: 0,
                value: [undefined]
            }
        }
    },
    {
        op: "event/onHoverIn",
        extension: "KHR_node_selectability",
        outputValueSockets: {
            hoverNodeIndex: {
                type: 1,
                value: [undefined]
            },
            controllerIndex: {
                type: 1,
                value: [undefined]
            }
        }
    },
    {
        op: "event/onHoverOut",
        extension: "KHR_node_selectability",
        outputValueSockets: {
            hoverNodeIndex: {
                type: 1,
                value: [undefined]
            },
            controllerIndex: {
                type: 1,
                value: [undefined]
            }
        }
    },
    {
        op: "math/quatConjugate"
    },
    {
        op: "math/quatMul"
    },
    {
        op: "math/quatAngleBetween"
    },
    {
        op: "math/quatFromAxisAngle"
    },
    {
        op: "math/quatToAxisAngle"
    },
    {
        op: "math/quatFromDirections"
    },
    {
        op: "math/quatFromUpForward"
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
        name: "float2x2",
        signature: InteractivityValueType.FLOAT2X2
    },
    {
        name: "float3x3",
        signature: InteractivityValueType.FLOAT3X3
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

const floatNTypes = [2,3,4,5,6,8];
const floatNxNTypes = [6,7,8];
const floatVectorTypes = [3,4,5];
export const anyType = [0,1,2,3,4,5,6,7,8,9];

const customNodeSpecs: IInteractivityNode[] = [
    {
        op: "ADBE/output_console_node",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "ADBE/output_console_node"),
        description: "Output a message to the console",
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
        },
        values: {
            input: {
                message: {
                    typeOptions: anyType,
                    type: 0,
                    value: [undefined]
                }
            }
        }
    }
]

const mathQuaternionNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/quatConjugate",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/quatConjugate"),
        description: "Conjugate a quaternion",
        values: {
            input: {
                a: {
                    typeOptions: [5],
                    description: "The quaternion to conjugate",
                    type: 5,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/quatMul",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/quatMul"),
        description: "Multiply two quaternions",
        values: {
            input: {
                a: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined]
                },
                b: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/quatAngleBetween",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/quatAngleBetween"),
        description: "Calculate the angle between two quaternions",
        values: {
            input: {
                a: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined]
                },
                b: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/quatFromAxisAngle",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/quatFromAxisAngle"),
        description: "Create a quaternion from an axis and an angle",
        values: {
            input: {
                axis: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined]
                },
                angle: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/quatToAxisAngle",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/quatToAxisAngle"),
        description: "Convert a quaternion to an axis and an angle",
        values: {
            input: {
                a: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined]
                }
            },
            output: {
                axis: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined]
                },
                angle: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/quatFromDirections",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/quatFromDirections"),
        description: "Create a quaternion from two directions",
        values: {
            input: {
                a: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined]
                },
                b: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/quatFromUpForward",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/quatFromUpForward"),
        description: "Create a quaternion from an up vector and a forward direction",
        values: {
            input: {
                up: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined]
                },
                forward: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined]
                }
            }
        }
    }
]

const hoverabilityNodeSpecs: IInteractivityNode[] = [
    {
        op: "event/onHoverIn",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "event/onHoverIn"),
        description: "Event that is triggered when a node is hovered over",
        configuration: {
            nodeIndex: {
                value: [undefined]
            },
            stopPropagation: {
                value: [undefined]
            }
        },
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
                hoverNodeIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                controllerIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "event/onHoverOut",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "event/onHoverOut"),
        description: "Event that is triggered when a node is hovered out",
        configuration: {
            nodeIndex: {
                value: [undefined]
            },
            stopPropagation: {
                value: [undefined]
            }
        },
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
                hoverNodeIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    }
]

const selectabilityNodeSpecs: IInteractivityNode[] = [
    {
        op: "event/onSelect",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "event/onSelect"),
        description: "Event that is triggered when a node is selected",
        configuration: {
            nodeIndex: {
                value: [undefined]
            },
            stopPropagation: {
                value: [undefined]
            }
        },
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
                selectedNodeIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                controllerIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                selectionPoint: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined]
                },
                selectionRayOrigin: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined]
                }
            }
        }
    }
]

const animationNodeSpecs: IInteractivityNode[] = [
    {
        op: "animation/start",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "animation/start"),
        description: "Start an animation",
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
                },
                err: {
                    node: undefined,
                    socket: undefined
                },
                done: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            input: {
                animation: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                startTime: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                endTime: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                speed: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "animation/stop",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "animation/stop"),
        description: "Stop an animation",
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
                },
                err: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            input: {
                animation: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "animation/stopAt",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "animation/stopAt"),
        description: "Stop an animation at a specific time",
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
                },
                err: {
                    node: undefined,
                    socket: undefined
                },
                done: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            input: {
                animation: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                stopTime: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    }
]

const mathTypeConversionNodeSpecs: IInteractivityNode[] = [
    {
        op: "type/boolToInt",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "type/boolToInt"),
        description: "Convert boolean to integer",
        values: {
            input: {
                a: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "type/boolToFloat",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "type/boolToFloat"), 
        description: "Convert boolean to float",
        values: {
            input: {
                a: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "type/intToBool",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "type/intToBool"),
        description: "Convert integer to boolean",
        values: {
            input: {
                a: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "type/intToFloat",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "type/intToFloat"),
        description: "Convert integer to float",
        values: {
            input: {
                a: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "type/floatToBool",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "type/floatToBool"),
        description: "Convert float to boolean",
        values: {
            input: {
                a: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "type/floatToInt",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "type/floatToInt"),
        description: "Convert float to integer",
        values: {
            input: {
                a: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    }
]

const mathIntegerBitwiseNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/not",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/not"),
        description: "NOT operation",
        values: {
            input: {
                a: {
                    typeOptions: [0, 1],
                    type: 0,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [0, 1],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/and",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/and"),
        description: "AND operation",
        values: {
            input: {
                a: {
                    typeOptions: [0, 1],
                    type: 0,
                    value: [undefined]
                },
                b: {
                    typeOptions: [0, 1],
                    type: 0,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [0, 1],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/or",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/or"),
        description: "OR operation",
        values: {
            input: {
                a: {
                    typeOptions: [0, 1],
                    type: 0,
                    value: [undefined]
                },
                b: {
                    typeOptions: [0, 1],
                    type: 0,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [0, 1],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/xor",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/xor"),
        description: "XOR operation",
        values: {
            input: {
                a: {
                    typeOptions: [0, 1],
                    type: 0,
                    value: [undefined]
                },
                b: {
                    typeOptions: [0, 1],
                    type: 0,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [0, 1],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/asr",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/asr"),
        description: "Arithmetic shift right",
        values: {
            input: {
                a: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/lsl",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/lsl"),
        description: "Logical shift left",
        values: {
            input: {
                a: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/clz",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/clz"),
        description: "Count leading zeros",
        values: {
            input: {
                a: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/ctz",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/ctz"),
        description: "Count trailing zeros",
        values: {
            input: {
                a: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/popcnt",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/popcnt"),
        description: "Count number of set bits",
        values: {
            input: {
                a: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    }
]

const mathSwizzleNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/combine2",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/combine2"),
        description: "Combine two floats into a float2",
        values: {
            input: {
                a: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                b: {
                    typeOptions: [2], 
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [3],
                    type: 3,
                    value: [undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/combine3",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/combine3"),
        description: "Combine three floats into a float3",
        values: {
            input: {
                a: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                b: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                c: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/combine4",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/combine4"),
        description: "Combine four floats into a float4",
        values: {
            input: {
                a: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                b: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                c: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                d: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined, undefined, undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/combine2x2",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/combine2x2"),
        description: "Combine 4 floats into a float2x2",
        values: {
            input: {
                a: { typeOptions: [2], type: 2, value: [undefined] },
                b: { typeOptions: [2], type: 2, value: [undefined] },
                c: { typeOptions: [2], type: 2, value: [undefined] },
                d: { typeOptions: [2], type: 2, value: [undefined] }
            },
            output: {
                value: {
                    typeOptions: [6],
                    type: 6,
                    value: [undefined, undefined, 
                            undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/combine3x3",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/combine3x3"),
        description: "Combine 9 floats into a float3x3",
        values: {
            input: {
                a: { typeOptions: [2], type: 2, value: [undefined] },
                b: { typeOptions: [2], type: 2, value: [undefined] },
                c: { typeOptions: [2], type: 2, value: [undefined] },
                d: { typeOptions: [2], type: 2, value: [undefined] },
                e: { typeOptions: [2], type: 2, value: [undefined] },
                f: { typeOptions: [2], type: 2, value: [undefined] },
                g: { typeOptions: [2], type: 2, value: [undefined] },
                h: { typeOptions: [2], type: 2, value: [undefined] },
                i: { typeOptions: [2], type: 2, value: [undefined] }
            },
            output: {
                value: {
                    typeOptions: [7],
                    type: 7,
                    value: [undefined, undefined, undefined, 
                        undefined, undefined, undefined, 
                        undefined, undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/combine4x4",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/combine4x4"),
        description: "Combine 16 floats into a float4x4",
        values: {
            input: {
                a: { typeOptions: [2], type: 2, value: [undefined] },
                b: { typeOptions: [2], type: 2, value: [undefined] },
                c: { typeOptions: [2], type: 2, value: [undefined] },
                d: { typeOptions: [2], type: 2, value: [undefined] },
                e: { typeOptions: [2], type: 2, value: [undefined] },
                f: { typeOptions: [2], type: 2, value: [undefined] },
                g: { typeOptions: [2], type: 2, value: [undefined] },
                h: { typeOptions: [2], type: 2, value: [undefined] },
                i: { typeOptions: [2], type: 2, value: [undefined] },
                j: { typeOptions: [2], type: 2, value: [undefined] },
                k: { typeOptions: [2], type: 2, value: [undefined] },
                l: { typeOptions: [2], type: 2, value: [undefined] },
                m: { typeOptions: [2], type: 2, value: [undefined] },
                n: { typeOptions: [2], type: 2, value: [undefined] },
                o: { typeOptions: [2], type: 2, value: [undefined] },
                p: { typeOptions: [2], type: 2, value: [undefined] }
            },
            output: {
                value: {
                    typeOptions: [8],
                    type: 8,
                    value: [undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/extract2",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/extract2"),
        description: "Extract components from a float2",
        values: {
            input: {
                a: {
                    typeOptions: [3],
                    type: 3,
                    value: [undefined, undefined]
                }
            },
            output: {
                0: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                1: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/extract3",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/extract3"),
        description: "Extract components from a float3",
        values: {
            input: {
                a: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                }
            },
            output: {
                0: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                1: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                2: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/extract4",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/extract4"),
        description: "Extract components from a float4",
        values: {
            input: {
                a: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined, undefined, undefined, undefined]
                }
            },
            output: {
                0: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                1: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                2: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                3: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/extract2x2",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/extract2x2"),
        description: "Extract components from a float2x2",
        values: {
            input: {
                a: {
                    typeOptions: [6],
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                }
            },
            output: {
                0: { typeOptions: [2], type: 2, value: [undefined] },
                1: { typeOptions: [2], type: 2, value: [undefined] },
                2: { typeOptions: [2], type: 2, value: [undefined] },
                3: { typeOptions: [2], type: 2, value: [undefined] }
            }
        }
    },
    {
        op: "math/extract3x3",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/extract3x3"),
        description: "Extract components from a float3x3",
        values: {
            input: {
                a: {
                    typeOptions: [7],
                    type: 7,
                    value: [undefined, undefined, undefined,
                           undefined, undefined, undefined,
                           undefined, undefined, undefined]
                }
            },
            output: {
                0: { typeOptions: [2], type: 2, value: [undefined] },
                1: { typeOptions: [2], type: 2, value: [undefined] },
                2: { typeOptions: [2], type: 2, value: [undefined] },
                3: { typeOptions: [2], type: 2, value: [undefined] },
                4: { typeOptions: [2], type: 2, value: [undefined] },
                5: { typeOptions: [2], type: 2, value: [undefined] },
                6: { typeOptions: [2], type: 2, value: [undefined] },
                7: { typeOptions: [2], type: 2, value: [undefined] },
                8: { typeOptions: [2], type: 2, value: [undefined] }
            }
        }
    },
    {
        op: "math/extract4x4",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/extract4x4"),
        description: "Extract components from a float4x4",
        values: {
            input: {
                a: {
                    typeOptions: [8],
                    type: 8,
                    value: [undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined]
                }
            },
            output: {
                0: { typeOptions: [2], type: 2, value: [undefined] },
                1: { typeOptions: [2], type: 2, value: [undefined] },
                2: { typeOptions: [2], type: 2, value: [undefined] },
                3: { typeOptions: [2], type: 2, value: [undefined] },
                4: { typeOptions: [2], type: 2, value: [undefined] },
                5: { typeOptions: [2], type: 2, value: [undefined] },
                6: { typeOptions: [2], type: 2, value: [undefined] },
                7: { typeOptions: [2], type: 2, value: [undefined] },
                8: { typeOptions: [2], type: 2, value: [undefined] },
                9: { typeOptions: [2], type: 2, value: [undefined] },
                10: { typeOptions: [2], type: 2, value: [undefined] },
                11: { typeOptions: [2], type: 2, value: [undefined] },
                12: { typeOptions: [2], type: 2, value: [undefined] },
                13: { typeOptions: [2], type: 2, value: [undefined] },
                14: { typeOptions: [2], type: 2, value: [undefined] },
                15: { typeOptions: [2], type: 2, value: [undefined] }
            }
        }
    }
]

const mathMatrixNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/transpose",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/transpose"),
        description: "Transpose of a matrix",
        values: {
            input: {
                a: {
                    typeOptions: floatNxNTypes,
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNxNTypes, 
                    type: 6,
                    value: [undefined, undefined,
                        undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/determinant",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/determinant"),
        description: "Determinant of a matrix",
        values: {
            input: {
                a: {
                    typeOptions: floatNxNTypes,
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/inverse",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/inverse"),
        description: "Inverse of a matrix",
        values: {
            input: {
                a: {
                    typeOptions: floatNxNTypes,
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNxNTypes,
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                },
                isValid: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/matMul",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/matMul"),
        description: "Multiply two matrices",
        values: {
            input: {
                a: {
                    typeOptions: floatNxNTypes,
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                },
                b: {
                    typeOptions: floatNxNTypes,
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNxNTypes,
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/matCompose",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/matCompose"),
        description: "Compose a matrix from a translation, rotation, and scale",
        values: {
            input: {
                translation: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                },
                rotation: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined, undefined, undefined, undefined]
                },
                scale: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [8],
                    type: 8,
                    value: [undefined, undefined, undefined, undefined,
                        undefined, undefined, undefined, undefined,
                        undefined, undefined, undefined, undefined,
                        undefined, undefined, undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/matDecompose",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/matDecompose"),
        description: "Decompose a matrix into a translation, rotation, and scale",
        values: {
            input: {
                a: {
                    typeOptions: [8],
                    type: 8,
                    value: [undefined, undefined, undefined, undefined,
                        undefined, undefined, undefined, undefined,
                        undefined, undefined, undefined, undefined,
                        undefined, undefined, undefined, undefined]
                }
            },
            output: {
                translation: {
                    typeOptions: [3],
                    type: 3,
                    value: [undefined, undefined, undefined]
                },
                rotation: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined, undefined]
                },
                scale: {
                    typeOptions: [3],
                    type: 3,
                    value: [undefined, undefined, undefined]
                },
                isValid: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    }
]

const mathVectorNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/length",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/length"),
        description: "Length of a vector",
        values: {
            input: {
                a: {
                    typeOptions: floatVectorTypes,
                    type: 3,
                    value: [undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/normalize",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/normalize"), 
        description: "Normalize a vector to length 1",
        values: {
            input: {
                a: {
                    typeOptions: floatVectorTypes,
                    type: 3,
                    value: [undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatVectorTypes,
                    type: 3,
                    value: [undefined, undefined]
                },
                isValid: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/dot",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/dot"),
        description: "Dot product of two vectors",
        values: {
            input: {
                a: {
                    typeOptions: floatVectorTypes,
                    type: 3,
                    value: [undefined, undefined]
                },
                b: {
                    typeOptions: floatVectorTypes,
                    type: 3,
                    value: [undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/cross",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/cross"),
        description: "Cross product of two 3D vectors",
        values: {
            input: {
                a: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                },
                b: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/rotate2d",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/rotate2d"),
        description: "Rotate a 2D vector by an angle in radians",
        values: {
            input: {
                a: {
                    typeOptions: [3],
                    type: 3,
                    value: [undefined, undefined]
                },
                angle: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [3],
                    type: 3,
                    value: [undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/rotate3d",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/rotate3d"),
        description: "Rotate a 3D vector by a quaternion",
        values: {
            input: {
                a: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                },
                rotation: {
                    typeOptions: [5],
                    type: 4,
                    value: [undefined, undefined, undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/transform",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/transform"),
        description: "Transform a vector by a 4x4 matrix",
        values: {
            input: {
                a: {
                    typeOptions: [3,4,5],
                    type: 3,
                    value: [undefined, undefined]
                },
                b: {
                    typeOptions: floatNxNTypes,
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [3,4,5],
                    type: 3,
                    value: [undefined, undefined]
                }
            }
        }
    }
]

const mathExponentialNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/exp",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/exp"),
        description: "Returns e raised to the power of x",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/log",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/log"),
        description: "Natural logarithm (base e) of x",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/log2",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/log2"),
        description: "Base 2 logarithm of x",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/log10",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/log10"),
        description: "Base 10 logarithm of x",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/sqrt",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/sqrt"),
        description: "Square root of x",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/cbrt",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/cbrt"),
        description: "Cube root of x",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/pow",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/pow"),
        description: "x raised to the power of y",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                },
                b: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    }
]

const mathHyperbolicNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/sinh",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/sinh"),
        description: "Hyperbolic sine of an angle in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/cosh", 
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/cosh"),
        description: "Hyperbolic cosine of an angle in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/tanh",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/tanh"),
        description: "Hyperbolic tangent of an angle in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/asinh",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/asinh"),
        description: "Inverse hyperbolic sine in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/acosh",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/acosh"),
        description: "Inverse hyperbolic cosine in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/atanh",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/atanh"),
        description: "Inverse hyperbolic tangent in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    }
]

const mathTrigNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/rad",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/rad"),
        description: "Convert degrees to radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/deg",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/deg"), 
        description: "Convert radians to degrees",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/sin",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/sin"),
        description: "Sine of an angle in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/cos",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/cos"),
        description: "Cosine of an angle in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/tan",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/tan"),
        description: "Tangent of an angle in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/asin",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/asin"),
        description: "Arc sine in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/acos",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/acos"),
        description: "Arc cosine in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/atan",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/atan"),
        description: "Arc tangent in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/atan2",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/atan2"),
        description: "Arc tangent of y/x in radians",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                },
                b: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
]

const mathSpecialNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/isNaN",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/isNaN"),
        description: "Check if a number is NaN",
        values: {
            input: {
                a: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/isInf",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/isInf"),
        description: "Check if a number is infinite",
        values: {
            input: {
                a: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/select",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/select"),
        description: "Select a value based on a condition",
        values: {
            input: {
                condition: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                },
                a: {
                    typeOptions: anyType,
                    type: 0,
                    value: [undefined]
                },
                b: {
                    typeOptions: anyType,
                    type: 0,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: anyType,
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/switch",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/switch"),
        description: "Switch between two values based on a condition",
        configuration: {
            cases: {
                value: [undefined]
            }
        },
        values: {
            input: {
                default: {
                    typeOptions: anyType,
                    type: 0,
                    value: [undefined]
                },
                selection: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: anyType,
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/random",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/random"),
        description: "Generate a random number",
        values: {
            output: {
                value: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            }
        }
    }
]

const mathComparisonNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/eq",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/eq"),
        description: "Check if two numbers are equal",
        values: {
            input: {
                a: {
                    typeOptions: [0, 1, ...floatNTypes],
                    type: 0,
                    value: [undefined]
                },
                b: {
                    typeOptions: [0, 1, ...floatNTypes],
                    type: 0,
                    value: [undefined]
                },
            },
            output: {
                value: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/lt",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/lt"),
        description: "Check if a number is less than another number",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
            },
            output: {
                value: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/le",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/le"),
        description: "Check if a number is less than or equal to another number",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
            },
            output: {
                value: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/gt",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/gt"),
        description: "Check if a number is greater than another number",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
            },
            output: {
                value: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/ge",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/ge"),
        description: "Check if a number is greater than or equal to another number",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
            },
            output: {
                value: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    }
]

const mathArithmeticNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/abs",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/abs"),
        description: "Absolute value of a number",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/sign",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/sign"),
        description: "Sign of a number",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/trunc",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/trunc"),
        description: "Truncate a number",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/floor",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/floor"),
        description: "Floor a number",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/ceil",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/ceil"),
        description: "Ceil a number",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/round",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/round"),
        description: "Round a number",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/fract",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/fract"),
        description: "Fractional part of a number",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/neg",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/neg"),
        description: "Negate a number",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/add",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/add"),
        description: "Add two numbers",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            }
        },
    },
    {
        op: "math/sub",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/sub"),
        description: "Subtract two numbers",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/mul",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/mul"),
        description: "Multiply two numbers",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/div",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/div"),
        description: "Divide two numbers",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/rem",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/rem"),
        description: "Remainder of two numbers",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/min",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/min"),
        description: "Minimum of two numbers",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/max",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/max"),
        description: "Maximum of two numbers",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/clamp",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/clamp"),
        description: "Clamp a number between two numbers",
        values: {
            input: {
                a: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                },
                c: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/saturate",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/saturate"),
        description: "Saturate a number",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/mix",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/mix"),
        description: "Mix two numbers",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                },
                b: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                },
                c: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                }
            }
        }
    }
]

const mathConstantNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/E",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/E"),
        description: "The mathematical constant e",
        values: {
            output: {
                value: {
                    typeOptions: [2],
                    type: 2,
                    value: [Math.E]
                }
            }
        }
    },
    {
        op: "math/Pi",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/Pi"),
        description: "The mathematical constant pi",
        values: {
            output: {
                value: {
                    typeOptions: [2],
                    type: 2,
                    value: [Math.PI]
                }
            }
        }
    },
    {
        op: "math/Inf",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/Inf"),
        description: "The mathematical constant infinity",
        values: {
            output: {
                value: {
                    typeOptions: [2],
                    type: 2,
                    value: [Infinity]
                }
            }
        }
    },
    {
        op: "math/NaN",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/NaN"),
        description: "The mathematical constant NaN",
        values: {
            output: {
                value: {
                    typeOptions: [2],
                    type: 2,
                    value: [NaN]
                }
            }
        }
    }
];



const variableNodeSpecs: IInteractivityNode[] = [
    {
        op: "variable/set",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "variable/set"),
        description: "Set multiple variables to a value",
        configuration: {
            variables: {
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
        op: "variable/get",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "variable/get"),
        description: "Get a variable's value",
        configuration: {
            variable: {
                value: [undefined]
            }
        }
    },
    {
        op: "variable/interpolate",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "variable/interpolate"),
        description: "Interpolate a variable between two values",
        configuration: {
            variable: {
                value: [undefined]
            },
            useSlerp: {
                value: [undefined]
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
                },
                err: {
                    node: undefined,
                    socket: undefined
                },
                done: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            input: {
                duration: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                p1: {
                    typeOptions: [3],
                    type: 3,
                    value: [undefined, undefined]
                },
                p2: {
                    typeOptions: [3],
                    type: 3,
                    value: [undefined, undefined]
                }
            }
        }
    }
]

const pointerNodeSpecs: IInteractivityNode[] = [
    {
        op: "pointer/set",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "pointer/set"),
        description: "Set a pointer to a value",
        configuration: {
            pointer: {
                value: [undefined],
            },
            type: {
                value: [undefined]
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
                },
                err: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            input: {
                value: {
                    typeOptions: anyType,
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "pointer/get",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "pointer/get"),
        description: "Get a pointer's value",
        configuration: {
            pointer: {
                value: [undefined]
            },
            type: {
                value: [undefined]
            }
        },
        values: {
            output: {
                value: {
                    typeOptions: anyType,
                    type: 0,
                    value: [undefined]
                },
                isValid: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "pointer/interpolate",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "pointer/interpolate"),
        description: "Interpolate a pointer between two values",
        configuration: {
            pointer: {
                value: [undefined]
            },
            type: {
                value: [undefined]
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
                },
                err: {
                    node: undefined,
                    socket: undefined
                },
                done: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            input: {
                value: {
                    typeOptions: anyType,
                    type: 0,
                    value: [undefined]
                },
                duration: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                p1: {
                    typeOptions: [3],
                    type: 3,
                    value: [undefined, undefined]
                },
                p2: {
                    typeOptions: [3],
                    type: 3,
                    value: [undefined, undefined]
                }
            }
        }
    }
]

const lifecycleNodeSpecs: IInteractivityNode[] = [
    {
        op: "event/onStart",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "event/onStart"),
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
        op: "event/onTick",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "event/onTick"),
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
    {
        op: "event/receive",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "event/receive"),
        description: "This node will fire when an event is received",
        configuration: {
            event: {
                value: [undefined]
            }
        },
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
        op: "event/send",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "event/send"),
        description: "This node will send an event",
        configuration: {
            event: {
                value: [undefined]
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
    }
]

const flowNodeSpecs: IInteractivityNode[] = [
    {
        op: "flow/switch",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "flow/switch"),
        description: "Switch the control flow based on a condition.",
        configuration: {
            cases: {
                value: [undefined]
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
                default: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            input: {
                selection: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "flow/while",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "flow/while"),
        description: "While a condition is true, execute the subgraph",
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
                condition: {
                    typeOptions: [0],
                    type: 0,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "flow/doN",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "flow/doN"),
        description: "Execute the subgraph N times",
        flows: {
            input: {
                in: {
                    node: undefined,
                    socket: undefined
                },
                reset: {
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
        },
        values: {
            input: {
                n: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                currentCount: {
                    typeOptions: [1],
                    type: 1,
                    value: [0]
                }
            }
        }
    },
    {
        op: "flow/multiGate",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "flow/multiGate"),
        description: "Multiplex the control flow based on a selection",
        flows: {
            input: {
                in: {
                    node: undefined,
                    socket: undefined
                },
                reset: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            output: {
                lastIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [-1]
                }
            }
        }
    },
    {
        op: "flow/waitAll",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "flow/waitAll"),
        description: "Wait for all the subgraphs to complete",
        flows: {
            input: {
                reset: {
                    node: undefined,
                    socket: undefined
                }
            },
            output: {
                out: {
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
            output: {
                remainingInputs: {
                    typeOptions: [1],
                    type: 1,
                    value: [0]
                }
            }
        }
    },
    {
        op: "flow/throttle",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "flow/throttle"),
        description: "Throttle the control flow based on a condition",
        flows: {
            input: {
                in: {
                    node: undefined,
                    socket: undefined
                },
                reset: {
                    node: undefined,
                    socket: undefined
                }
            },
            output: {
                out: {
                    node: undefined,
                    socket: undefined
                },
                err: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            input: {
                duration: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                lastRemainingTime: {
                    typeOptions: [2],
                    type: 2,
                    value: [NaN]
                }
            }
        }
    },
    {
        op: "flow/setDelay",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "flow/setDelay"),
        description: "Set the delay for the control flow",
        flows: {
            input: {
                in: {
                    node: undefined,
                    socket: undefined
                },
                cancel: {
                    node: undefined,
                    socket: undefined
                }
            },
            output: {
                out: {
                    node: undefined,
                    socket: undefined
                },
                err: {
                    node: undefined,
                    socket: undefined
                },
                done: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            input: {
                duration: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                lastDelayIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [-1]
                }
            }
        }
    },
    {
        op: "flow/cancelDelay",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "flow/cancelDelay"),
        description: "Cancel the delay for the control flow",
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
        },
        values: {
            input: {
                delayIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "flow/branch",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "flow/branch"),
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
        op: "flow/for",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "flow/for"),
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
            },
            output: {
                index: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "flow/sequence",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "flow/sequence"),
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


const debugNodeSpecs: IInteractivityNode[] = [
    {
        op: "debug/log",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "debug/log"),
        description: "Log the value to the console",
        configuration: {
            severity: {
                value: [undefined]
            },
            message: {
                value: [undefined]
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
    }
]

export const interactivityNodeSpecs: IInteractivityNode[] = [
    ...mathConstantNodeSpecs, ...mathArithmeticNodeSpecs, ...mathComparisonNodeSpecs, ...mathTrigNodeSpecs,
    ...mathSpecialNodeSpecs,...lifecycleNodeSpecs, ...flowNodeSpecs, ...variableNodeSpecs, ...mathHyperbolicNodeSpecs,
    ...mathExponentialNodeSpecs, ...mathVectorNodeSpecs, ...mathMatrixNodeSpecs, ...mathSwizzleNodeSpecs, ...mathIntegerBitwiseNodeSpecs,
    ...mathTypeConversionNodeSpecs, ...pointerNodeSpecs, ...animationNodeSpecs, ...selectabilityNodeSpecs, ...customNodeSpecs, ...hoverabilityNodeSpecs,
    ...mathQuaternionNodeSpecs,...debugNodeSpecs
];

export const createNoOpNode = (declaration: IInteractivityDeclaration): IInteractivityNode => {
    const outValues: Record<string, IInteractivityValue> = {};
    Object.entries(declaration.outputValueSockets || {}).forEach(([key, value]) => {
        outValues[key] = { value: [undefined], type: value.type };
    });

    const inValues: Record<string, IInteractivityValue> = {};
    Object.entries(declaration.inputValueSockets || {}).forEach(([key, value]) => {
        inValues[key] = { value: [undefined], type: value.type };
    });

    const noOpNode: IInteractivityNode = {
        op: declaration.op,
        declaration: knownDeclarations.findIndex(knownDeclaration => knownDeclaration.op === declaration.op),
        description: "NoOp",
        values: {
            output: outValues,
            input: inValues
        }
    };
    return noOpNode;
};