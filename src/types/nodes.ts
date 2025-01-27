import { IInteractivityDecleration, IInteractivityNode, IInteractivityValueType, InteractivityValueType } from "./InteractivityGraph";

export const knownDeclerations: IInteractivityDecleration[] = [
    {
        op: "math/e"
    },
    {
        op: "math/pi"
    },
    {
        op: "math/inf"
    },
    {
        op: "math/nan"
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
        op: "math/isnan"
    },
    {
        op: "math/isinf"
    },
    {
        op: "math/select"
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
        op: "math/matmul"
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

const floatNTypes = [2,3,4,5,6];
const floatVectorTypes = [3,4,5];
const anyType = [0,1,2,3,4,5,6,7];

const animationNodeSpecs: IInteractivityNode[] = [
    {
        op: "animation/start",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "animation/start"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "animation/stop"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "animation/stopAt"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "type/boolToInt"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "type/boolToFloat"), 
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "type/intToBool"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "type/intToFloat"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "type/floatToBool"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "type/floatToInt"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/not"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/and"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/or"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/xor"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/asr"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/lsl"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/clz"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/ctz"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/popcnt"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/combine2"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/combine3"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/combine4"),
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
        op: "math/combine4x4",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/combine4x4"),
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
                    typeOptions: [6],
                    type: 6,
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/extract2"),
        description: "Extract components from a float2",
        values: {
            input: {
                value: {
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/extract3"),
        description: "Extract components from a float3",
        values: {
            input: {
                value: {
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/extract4"),
        description: "Extract components from a float4",
        values: {
            input: {
                value: {
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
        op: "math/extract4x4",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/extract4x4"),
        description: "Extract components from a float4x4",
        values: {
            input: {
                value: {
                    typeOptions: [6],
                    type: 6,
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
    //TODO: work with 2x2 and 3x3
    {
        op: "math/transpose",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/transpose"),
        description: "Transpose of a matrix",
        values: {
            input: {
                a: {
                    typeOptions: [6],
                    type: 6,
                    value: [undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [6], 
                    type: 6,
                    value: [undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/determinant",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/determinant"),
        description: "Determinant of a matrix",
        values: {
            input: {
                a: {
                    typeOptions: [6],
                    type: 6,
                    value: [undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined]
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/inverse"),
        description: "Inverse of a matrix",
        values: {
            input: {
                a: {
                    typeOptions: [6],
                    type: 6,
                    value: [undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [6],
                    type: 6,
                    value: [undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/matmul",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/matmul"),
        description: "Multiply two matrices",
        values: {
            input: {
                a: {
                    typeOptions: [6],
                    type: 6,
                    value: [undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined]
                },
                b: {
                    typeOptions: [6],
                    type: 6,
                    value: [undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [6],
                    type: 6,
                    value: [undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined]
                }
            }
        }
    }
]

const mathVectorNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/length",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/length"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/normalize"), 
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
                }
            }
        }
    },
    {
        op: "math/dot",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/dot"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/cross"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/rotate2d"),
        description: "Rotate a 2D vector by an angle in radians",
        values: {
            input: {
                a: {
                    typeOptions: [3],
                    type: 3,
                    value: [undefined, undefined]
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
        op: "math/rotate3d",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/rotate3d"),
        description: "Rotate a 3D vector around an axis by an angle in radians",
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
        //TODO add other transform types for 2x2 3x3
        op: "math/transform",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/transform"),
        description: "Transform a vector by a 4x4 matrix",
        values: {
            input: {
                vector: {
                    typeOptions: [5],
                    type: 5,
                    value: [undefined, undefined, undefined, undefined]
                },
                matrix: {
                    typeOptions: [6],
                    type: 6,
                    value: [undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined,
                           undefined, undefined, undefined, undefined]
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
    }
]

const mathExponentialNodeSpecs: IInteractivityNode[] = [
    {
        op: "math/exp",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/exp"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/log"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/log2"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/log10"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/sqrt"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/cbrt"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/pow"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/sinh"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/cosh"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/tanh"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/asinh"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/acosh"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/atanh"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/rad"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/deg"), 
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/sin"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/cos"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/tan"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/asin"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/acos"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/atan"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/atan2"),
        description: "Arc tangent of y/x in radians",
        values: {
            input: {
                y: {
                    typeOptions: floatNTypes,
                    type: 2,
                    value: [undefined]
                },
                x: {
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
        op: "math/isnan",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/isnan"),
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
        op: "math/isinf",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/isinf"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/select"),
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
        op: "math/random",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/random"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/eq"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/lt"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/le"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/gt"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/ge"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/abs"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/sign"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/trunc"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/floor"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/ceil"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/round"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/fract"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/neg"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/add"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/sub"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/mul"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/div"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/rem"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/min"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/max"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/clamp"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/saturate"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/mix"),
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
        op: "math/e",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/e"),
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
        op: "math/pi",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/pi"),
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
        op: "math/inf",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/inf"),
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
        op: "math/nan",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "math/nan"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "variable/set"),
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
        op: "variable/get",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "variable/get"),
        description: "Get a variable's value",
        configuration: {
            variable: {
                value: [undefined]
            }
        }
    },
    {
        op: "variable/interpolate",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "variable/interpolate"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "pointer/set"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "pointer/get"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "pointer/interpolate"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "event/onStart"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "event/onTick"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "event/receive"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "event/send"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "flow/switch"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "flow/while"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "flow/doN"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "flow/multiGate"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "flow/waitAll"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "flow/throttle"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "flow/setDelay"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "flow/cancelDelay"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "flow/branch"),
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
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "flow/for"),
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
        op: "flow/sequence",
        decleration: knownDeclerations.findIndex(decleration => decleration.op === "flow/sequence"),
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

export const interactivityNodeSpecs: IInteractivityNode[] = [
    ...mathConstantNodeSpecs, ...mathArithmeticNodeSpecs, ...mathComparisonNodeSpecs, ...mathTrigNodeSpecs,
    ...mathSpecialNodeSpecs,...lifecycleNodeSpecs, ...flowNodeSpecs, ...variableNodeSpecs, ...mathHyperbolicNodeSpecs,
    ...mathExponentialNodeSpecs, ...mathVectorNodeSpecs, ...mathMatrixNodeSpecs, ...mathSwizzleNodeSpecs, ...mathIntegerBitwiseNodeSpecs,
    ...mathTypeConversionNodeSpecs, ...pointerNodeSpecs
];