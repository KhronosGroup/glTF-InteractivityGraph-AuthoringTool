import { IInteractivityDeclaration, IInteractivityEvent, IInteractivityNode, IInteractivityValue, IInteractivityValueType, IInteractivityVariable, InteractivityConfigurationValueType, InteractivityValueType, NodeSpecFlag } from "./InteractivityGraph";

// whether a node spec (or the spec matching a live node instance's `op`) declares the given trait
// - see NodeSpecFlag for what belongs here vs. a plain op-name check near its call site.
export const hasNodeSpecFlag = (spec: IInteractivityNode | undefined, flag: NodeSpecFlag): boolean =>
    spec?.flags?.includes(flag) ?? false;

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
        op: "math/smoothStep"
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
        op: "ref/eq"
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
        op: "math/slerp"
    },
    {
        op: "math/rotate2d"
    },
    {
        op: "math/rotate3D"
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
        op: "rigid_body/applyImpulse",
        extension: "KHR_physics_rigid_bodies",
        inputValueSockets: {
            nodeIndex: {
                type: 1,
                value: [undefined]
            },
            linearImpulse: {
                type: 4,
                value: [0,0,0]
            },
            angularImpulse: {
                type: 4,
                value: [0,0,0]
            }
        }
    },
    {
        op: "rigid_body/applyPointImpulse",
        extension: "KHR_physics_rigid_bodies",
        inputValueSockets: {
            nodeIndex: {
                type: 1,
                value: [undefined]
            },
            impulse: {
                type: 4,
                value: [undefined, undefined, undefined]
            },
            position: {
                type: 4,
                value: [undefined, undefined, undefined]
            }
        }
    },
    {
        op: "rigid_body/rayCast",
        extension: "KHR_physics_rigid_bodies",
        inputValueSockets: {
            rayStart: {
                type: 4,
                value: [undefined, undefined, undefined]
            },
            rayEnd: {
                type: 4,
                value: [undefined, undefined, undefined]
            },
            collisionFilterIndex: {
                type: 1,
                value: [undefined]
            }
        },
        outputValueSockets: {
            hitNodeIndex: {
                type: 1,
                value: [undefined]
            },
            hitFraction: {
                type: 2,
                value: [undefined]
            },
            hitNormal: {    
                type: 4,
                value: [undefined, undefined, undefined]
            }
        }
    },
    {
        op: "event/rigid_body_triggerEntered",
        extension: "KHR_physics_rigid_bodies",
        outputValueSockets: {
            colliderNodeIndex: {
                type: 1,
                value: [undefined]
            },
            motionNodeIndex: {
                type: 1,
                value: [undefined]
            }
        }
    },
    {
        op: "event/rigid_body_triggerExited",
        extension: "KHR_physics_rigid_bodies",
        outputValueSockets: {
            colliderNodeIndex: {
                type: 1,
                value: [undefined]
            },
            motionNodeIndex: {
                type: 1,
                value: [undefined]
            }
        }
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
    },
    {
        op: "math/quatSlerp"
    },
    {
        op: "math/rgbToOkLCh"
    },
    {
        op: "math/rgbFromOkLCh"
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
        name: "ref",
        signature: InteractivityValueType.REF
    },
    {
        name: "AMZN_interactivity_string",
        signature: InteractivityValueType.CUSTOM,
        extensions: {
            AMZN_interactivity_string: {}
        }
    }
]

// 0: bool, 1: int, 2: float, 3: float2, 4: float3, 5: float4, 6: float2x2, 7: float3x3, 8: float4x4, 9: ref, 10: AMZN_interactivity_string
const floatNTypes = [2,3,4,5];
const floatNxNTypes = [6,7,8];
const floatVectorTypes = [3,4,5];
export const anyType = [0,1,2,3,4,5,6,7,8,9,10];

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
    },
    {
        op: "math/quatSlerp",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/quatSlerp"),
        description: "Spherical linear interpolation between two quaternions",
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
                },
                c: {
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
        op: "math/rgbToOkLCh",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/rgbToOkLCh"),
        description: "Convert linear RGB to OkLCh",
        values: {
            input: {
                r: { typeOptions: [2], type: 2, value: [undefined] },
                g: { typeOptions: [2], type: 2, value: [undefined] },
                b: { typeOptions: [2], type: 2, value: [undefined] }
            },
            output: {
                l: { typeOptions: [2], type: 2, value: [undefined] },
                c: { typeOptions: [2], type: 2, value: [undefined] },
                h: { typeOptions: [2], type: 2, value: [undefined] }
            }
        }
    },
    {
        op: "math/rgbFromOkLCh",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/rgbFromOkLCh"),
        description: "Convert OkLCh to linear RGB",
        values: {
            input: {
                l: { typeOptions: [2], type: 2, value: [undefined] },
                c: { typeOptions: [2], type: 2, value: [undefined] },
                h: { typeOptions: [2], type: 2, value: [undefined] }
            },
            output: {
                r: { typeOptions: [2], type: 2, value: [undefined] },
                g: { typeOptions: [2], type: 2, value: [undefined] },
                b: { typeOptions: [2], type: 2, value: [undefined] }
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
                type: InteractivityConfigurationValueType.INT,
                description: "Index of the glTF node to observe for hover-in events; omit to listen for hover-in on any node",
                value: [undefined]
            },
            stopPropagation: {
                type: InteractivityConfigurationValueType.BOOLEAN,
                description: "If true, stops this event from propagating to other listeners once handled",
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
                type: InteractivityConfigurationValueType.INT,
                description: "Index of the glTF node to observe for hover-out events; omit to listen for hover-out on any node",
                value: [undefined]
            },
            stopPropagation: {
                type: InteractivityConfigurationValueType.BOOLEAN,
                description: "If true, stops this event from propagating to other listeners once handled",
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
                type: InteractivityConfigurationValueType.INT,
                description: "Index of the glTF node to observe for selection events; omit to listen for selection on any node",
                value: [undefined]
            },
            stopPropagation: {
                type: InteractivityConfigurationValueType.BOOLEAN,
                description: "If true, stops this event from propagating to other listeners once handled",
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

const rigidBodyNodeSpecs: IInteractivityNode[] = [
    {
        op: "rigid_body/applyImpulse",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "rigid_body/applyImpulse"),
        description: "Apply an impulse to a rigid body",
        flows: {
            input: {
                in: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            input: {
                nodeIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                linearImpulse: {
                    typeOptions: [4],
                    type: 4,
                    value: [0,0,0]
                },
                angularImpulse: {
                    typeOptions: [4],
                    type: 4,
                    value: [0,0,0]
                }
            }
        }
    },
    {
        op: "rigid_body/applyPointImpulse",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "rigid_body/applyPointImpulse"),
        description: "Apply a point impulse to a rigid body",
        flows: {
            input: {
                in: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            input: {
                nodeIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                impulse: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                },
                position: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                }
            }
        }
    },
    {
        op: "rigid_body/rayCast",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "rigid_body/rayCast"),
        description: "Perform a ray segment intersection against colliders in the scene",
        flows: {
            input: {
                in: {
                    node: undefined,
                    socket: undefined
                }
            },
            output: {
                hit: {
                    node: undefined,
                    socket: undefined
                },
                miss: {
                    node: undefined,
                    socket: undefined
                }
            }
        },
        values: {
            input: {
                rayStart: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                },
                rayEnd: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                },
                collisionFilterIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
            },
            output: {
                hitNodeIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                hitFraction: {
                    typeOptions: [2],
                    type: 2,
                    value: [undefined]
                },
                hitNormal: {
                    typeOptions: [4],
                    type: 4,
                    value: [undefined, undefined, undefined]
                }
            }
        }
    },
    {
        op: "event/rigid_body_triggerEntered",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "event/rigid_body_triggerEntered"),
        description: "Trigger entered event",
        configuration: {
            nodeIndex: {
                type: InteractivityConfigurationValueType.INT,
                description: "Index of the trigger glTF node to observe; omit to listen for trigger-enter on any node",
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
                colliderNodeIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                motionNodeIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "event/rigid_body_triggerExited",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "event/rigid_body_triggerExited"),
        description: "Trigger exited event",
        configuration: {
            nodeIndex: {
                type: InteractivityConfigurationValueType.INT,
                description: "Index of the trigger glTF node to observe; omit to listen for trigger-exit on any node",
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
                colliderNodeIndex: {
                    typeOptions: [1],
                    type: 1,
                    value: [undefined]
                },
                motionNodeIndex: {
                    typeOptions: [1],
                    type: 1,
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
                    value: [false]
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
                    value: [false]
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
                    typeGroup: "T",
                    description: "Operand",
                    type: 0,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [0, 1],
                    typeGroup: "T",
                    description: "Bitwise / logical NOT",
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
                    typeGroup: "T",
                    description: "First operand",
                    type: 0,
                    value: [undefined]
                },
                b: {
                    typeOptions: [0, 1],
                    typeGroup: "T",
                    description: "Second operand",
                    type: 0,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [0, 1],
                    typeGroup: "T",
                    description: "Bitwise / logical AND",
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
                    typeGroup: "T",
                    description: "First operand",
                    type: 0,
                    value: [undefined]
                },
                b: {
                    typeOptions: [0, 1],
                    typeGroup: "T",
                    description: "Second operand",
                    type: 0,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [0, 1],
                    typeGroup: "T",
                    description: "Bitwise / logical OR",
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
                    typeGroup: "T",
                    description: "First operand",
                    type: 0,
                    value: [undefined]
                },
                b: {
                    typeOptions: [0, 1],
                    typeGroup: "T",
                    description: "Second operand",
                    type: 0,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [0, 1],
                    typeGroup: "T",
                    description: "Bitwise / logical XOR",
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
                    typeGroup: "T",
                    description: "Matrix",
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNxNTypes,
                    typeGroup: "T",
                    description: "Transposed matrix",
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
                    description: "Matrix",
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [2],
                    description: "Determinant",
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
                    typeGroup: "T",
                    description: "Matrix",
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNxNTypes,
                    typeGroup: "T",
                    description: "Inverse matrix",
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                },
                isValid: {
                    typeOptions: [0],
                    description: "False if the matrix is not invertible",
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
                    typeGroup: "T",
                    description: "First matrix",
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                },
                b: {
                    typeOptions: floatNxNTypes,
                    typeGroup: "T",
                    description: "Second matrix",
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNxNTypes,
                    typeGroup: "T",
                    description: "Matrix product",
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
                    description: "Vector",
                    type: 3,
                    value: [undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [2],
                    description: "Length (magnitude)",
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
                    typeGroup: "T",
                    description: "Vector to normalize",
                    type: 3,
                    value: [undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatVectorTypes,
                    typeGroup: "T",
                    description: "Normalized vector",
                    type: 3,
                    value: [undefined, undefined]
                },
                isValid: {
                    typeOptions: [0],
                    description: "False if the input length was zero",
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
                    typeGroup: "T",
                    description: "First vector",
                    type: 3,
                    value: [undefined, undefined]
                },
                b: {
                    typeOptions: floatVectorTypes,
                    typeGroup: "T",
                    description: "Second vector",
                    type: 3,
                    value: [undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [2],
                    description: "Dot product",
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
                    description: "First vector",
                    type: 4,
                    value: [undefined, undefined, undefined]
                },
                b: {
                    typeOptions: [4],
                    description: "Second vector",
                    type: 4,
                    value: [undefined, undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [4],
                    description: "Cross product",
                    type: 4,
                    value: [undefined, undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/slerp",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/slerp"),
        description: "Spherical linear interpolation between two vectors",
        values: {
            input: {
                a: {
                    typeOptions: [3, 4],
                    typeGroup: "T",
                    description: "Start vector",
                    type: 3,
                    value: [undefined, undefined]
                },
                b: {
                    typeOptions: [3, 4],
                    typeGroup: "T",
                    description: "End vector",
                    type: 3,
                    value: [undefined, undefined]
                },
                c: {
                    typeOptions: [2],
                    description: "Interpolation coefficient (0–1)",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [3, 4],
                    typeGroup: "T",
                    description: "Interpolated vector",
                    type: 3,
                    value: [undefined, undefined]
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
                    description: "2D vector to rotate",
                    type: 3,
                    value: [undefined, undefined]
                },
                angle: {
                    typeOptions: [2],
                    description: "Rotation angle in radians",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [3],
                    description: "Rotated vector",
                    type: 3,
                    value: [undefined, undefined]
                }
            }
        }
    },
    {
        op: "math/rotate3D",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/rotate3D"),
        description: "Rotate a 3D vector by a quaternion",
        values: {
            input: {
                a: {
                    typeOptions: [4],
                    description: "3D vector to rotate",
                    type: 4,
                    value: [undefined, undefined, undefined]
                },
                rotation: {
                    typeOptions: [5],
                    description: "Rotation quaternion",
                    type: 5,
                    value: [undefined, undefined, undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [4],
                    description: "Rotated vector",
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
                    typeGroup: "T",
                    description: "Vector to transform",
                    type: 3,
                    value: [undefined, undefined]
                },
                b: {
                    typeOptions: floatNxNTypes,
                    description: "Transformation matrix",
                    type: 6,
                    value: [undefined, undefined,
                           undefined, undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [3,4,5],
                    typeGroup: "T",
                    description: "Transformed vector",
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
                    typeGroup: "T",
                    description: "Exponent",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Base",
                    type: 2,
                    value: [undefined]
                },
                b: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Exponent",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Angle in radians",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Angle in radians",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Angle in radians",
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
                    typeGroup: "T",
                    description: "Angle in degrees",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Angle in radians",
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
                    typeGroup: "T",
                    description: "Angle in radians",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Angle in degrees",
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
                    typeGroup: "T",
                    description: "Angle in radians",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Angle in radians",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Angle in radians",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Result",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Angle in radians",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Angle in radians",
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
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Angle in radians",
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
                    typeGroup: "T",
                    description: "y",
                    type: 2,
                    value: [undefined]
                },
                b: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "x",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Angle in radians",
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
                    description: "Selects b when true, a when false",
                    type: 0,
                    value: [false]
                },
                a: {
                    typeOptions: anyType,
                    typeGroup: "T",
                    description: "Value returned when condition is false",
                    type: 0,
                    value: [undefined]
                },
                b: {
                    typeOptions: anyType,
                    typeGroup: "T",
                    description: "Value returned when condition is true",
                    type: 0,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: anyType,
                    typeGroup: "T",
                    description: "Selected value",
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
                type: InteractivityConfigurationValueType.INT_ARR,
                description: "Integer case values; generates one input value socket per entry, named after the case number. Empty by default, in which case only `selection` and `default` sockets exist",
                value: [undefined]
            }
        },
        values: {
            input: {
                default: {
                    typeOptions: anyType,
                    typeGroup: "T",
                    description: "Value returned when no case matches",
                    type: 0,
                    value: [undefined]
                },
                selection: {
                    typeOptions: [1],
                    description: "Integer selecting the matching case",
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: anyType,
                    typeGroup: "T",
                    description: "Selected value",
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
                    typeOptions: [0, 1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "First value",
                    type: 0,
                    value: [undefined]
                },
                b: {
                    typeOptions: [0, 1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Second value",
                    type: 0,
                    value: [undefined]
                },
            },
            output: {
                value: {
                    typeOptions: [0],
                    description: "Comparison result",
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
                    typeOptions: [1, 2],
                    typeGroup: "T",
                    description: "First value to compare",
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, 2],
                    typeGroup: "T",
                    description: "Second value to compare",
                    type: 1,
                    value: [undefined]
                },
            },
            output: {
                value: {
                    typeOptions: [0],
                    description: "Comparison result",
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
                    typeOptions: [1, 2],
                    typeGroup: "T",
                    description: "First value to compare",
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, 2],
                    typeGroup: "T",
                    description: "Second value to compare",
                    type: 1,
                    value: [undefined]
                },
            },
            output: {
                value: {
                    typeOptions: [0],
                    description: "Comparison result",
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
                    typeOptions: [1, 2],
                    typeGroup: "T",
                    description: "First value to compare",
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, 2],
                    typeGroup: "T",
                    description: "Second value to compare",
                    type: 1,
                    value: [undefined]
                },
            },
            output: {
                value: {
                    typeOptions: [0],
                    description: "Comparison result",
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
                    typeOptions: [1, 2],
                    typeGroup: "T",
                    description: "First value to compare",
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, 2],
                    typeGroup: "T",
                    description: "Second value to compare",
                    type: 1,
                    value: [undefined]
                },
            },
            output: {
                value: {
                    typeOptions: [0],
                    description: "Comparison result",
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
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Value",
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Result",
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
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Value",
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Result",
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
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Result",
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
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Result",
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
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Result",
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
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Result",
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
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Result",
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
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Value to negate",
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Negated value",
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
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "First addend",
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Second addend",
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Sum",
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
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Minuend",
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Subtrahend",
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Difference",
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
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "First factor",
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Second factor",
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Product",
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
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Dividend",
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Divisor",
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Quotient",
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
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Dividend",
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Divisor",
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Remainder",
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
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "First operand",
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Second operand",
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Result",
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
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "First operand",
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Second operand",
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Result",
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
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Value to clamp",
                    type: 1,
                    value: [undefined]
                },
                b: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Minimum",
                    type: 1,
                    value: [undefined]
                },
                c: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Maximum",
                    type: 1,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [1, ...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Clamped value",
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
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Value",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Value clamped to [0, 1]",
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
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Start value",
                    type: 2,
                    value: [undefined]
                },
                b: {
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "End value",
                    type: 2,
                    value: [undefined]
                },
                c: {
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Interpolation coefficient (0–1)",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: [...floatNTypes, ...floatNxNTypes],
                    typeGroup: "T",
                    description: "Interpolated value",
                    type: 2,
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "math/smoothStep",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "math/smoothStep"),
        description: "Smooth step (Hermite interpolation)",
        values: {
            input: {
                a: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Lower edge",
                    type: 2,
                    value: [undefined]
                },
                b: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Upper edge",
                    type: 2,
                    value: [undefined]
                },
                c: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Value to interpolate",
                    type: 2,
                    value: [undefined]
                }
            },
            output: {
                value: {
                    typeOptions: floatNTypes,
                    typeGroup: "T",
                    description: "Smoothly interpolated result",
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
        flags: [NodeSpecFlag.DynamicSockets],
        configuration: {
            variables: {
                type: InteractivityConfigurationValueType.INT_ARR,
                description: "Indices of the custom variables to set; generates one input value socket per entry, named after the variable index",
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
                type: InteractivityConfigurationValueType.INT,
                description: "Index of the custom variable to read",
                value: [undefined]
            }
        }
    },
    {
        op: "variable/interpolate",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "variable/interpolate"),
        description: "Interpolate a variable between two values",
        flags: [NodeSpecFlag.DynamicSockets],
        configuration: {
            variable: {
                type: InteractivityConfigurationValueType.INT,
                description: "Index of the custom variable to interpolate",
                value: [undefined]
            },
            useSlerp: {
                type: InteractivityConfigurationValueType.BOOLEAN,
                description: "Whether to use spherical linear interpolation (slerp), typically for quaternion variables",
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
        flags: [NodeSpecFlag.DynamicSockets],
        configuration: {
            pointer: {
                type: InteractivityConfigurationValueType.STRING,
                description: "JSON Pointer template of the glTF Object Model property to write; `[param]`/`{param}` segments generate matching input value sockets",
                value: [undefined],
            },
            type: {
                type: InteractivityConfigurationValueType.INT,
                description: "Index into the graph's `types` array specifying the property's value type",
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
        flags: [NodeSpecFlag.DynamicSockets],
        configuration: {
            pointer: {
                type: InteractivityConfigurationValueType.STRING,
                description: "JSON Pointer template of the glTF Object Model property to read; `[param]`/`{param}` segments generate matching input value sockets",
                value: [undefined]
            },
            type: {
                type: InteractivityConfigurationValueType.INT,
                description: "Index into the graph's `types` array specifying the property's value type",
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
        flags: [NodeSpecFlag.DynamicSockets],
        configuration: {
            pointer: {
                type: InteractivityConfigurationValueType.STRING,
                description: "JSON Pointer template of the glTF Object Model property to interpolate; `[param]`/`{param}` segments generate matching input value sockets",
                value: [undefined]
            },
            type: {
                type: InteractivityConfigurationValueType.INT,
                description: "Index into the graph's `types` array specifying the property's value type",
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
        },
        values: {
            output: {
                event: {
                    typeOptions: [9],
                    type: 9,
                    description: "Reference to this event",
                    value: [undefined]
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
                event: {
                    typeOptions: [9],
                    type: 9,
                    description: "Reference to this event",
                    value: [undefined]
                },
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
                type: InteractivityConfigurationValueType.INT,
                description: "Index of the custom event to listen for",
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
                event: {
                    typeOptions: [9],
                    type: 9,
                    description: "Reference to this event",
                    value: [undefined]
                }
            }
        }
    },
    {
        op: "event/send",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "event/send"),
        description: "This node will send an event",
        flags: [NodeSpecFlag.DynamicSockets],
        configuration: {
            event: {
                type: InteractivityConfigurationValueType.INT,
                description: "Index of the custom event to send",
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
        flags: [NodeSpecFlag.DynamicSockets],
        configuration: {
            cases: {
                type: InteractivityConfigurationValueType.INT_ARR,
                description: "Integer case values; generates one output flow socket per entry, named after the case number. Empty by default, in which case only the `default` output flow exists",
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
                    value: [false]
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
        flags: [NodeSpecFlag.DynamicSockets, NodeSpecFlag.DynamicFlowOutputs],
        configuration: {
            isRandom: {
                type: InteractivityConfigurationValueType.BOOLEAN,
                description: "If true, output flows are activated in random order, picking a random not-yet-used output each time. False in the default configuration",
                value: [undefined]
            },
            isLoop: {
                type: InteractivityConfigurationValueType.BOOLEAN,
                description: "If true, output flow activation repeats in a loop once all outputs have been used. False in the default configuration",
                value: [undefined]
            }
        },
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
        configuration: {
            inputFlows: {
                type: InteractivityConfigurationValueType.INT,
                description: "Number of input flows to wait for (0-64); generates that many numbered input flow sockets from 0 to n-1. Zero in the default configuration",
                value: [undefined]
            }
        },
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
                lastDelay: {
                    typeOptions: [9],
                    type: 9,
                    value: [null]
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
                delay: {
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
                    value: [false]
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
                type: InteractivityConfigurationValueType.INT,
                description: "The index value before the loop starts. Zero in the default configuration",
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
        flags: [NodeSpecFlag.DynamicSockets, NodeSpecFlag.DynamicFlowOutputs],
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
        flags: [NodeSpecFlag.DynamicSockets],
        configuration: {
            severity: {
                type: InteractivityConfigurationValueType.INT,
                description: "Severity level of the logged message, for implementation-defined filtering",
                value: [undefined]
            },
            message: {
                type: InteractivityConfigurationValueType.STRING,
                description: "Message template string; `{param}` segments generate matching input value sockets evaluated at runtime",
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

const refNodeSpecs: IInteractivityNode[] = [
    {
        op: "ref/eq",
        declaration: knownDeclarations.findIndex(declaration => declaration.op === "ref/eq"),
        description: "Compare two references",
        values: {
            input: {
                a: {
                    typeOptions: [9],
                    description: "First reference",
                    type: 9,
                    value: [undefined]
                },
                b: {
                    typeOptions: [9],
                    description: "Second reference",
                    type: 9,
                    value: [undefined]
                },
            },
            output: {
                value: {
                    typeOptions: [0],
                    description: "True if both point to the same object",
                    type: 0,
                    value: [undefined]
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
    ...mathQuaternionNodeSpecs,...debugNodeSpecs, ...rigidBodyNodeSpecs, ...refNodeSpecs
];

/**
 * Spec-declared socket names that share `group` on a node. Membership is read from the immutable
 * node spec (not the live model) because connecting an input overwrites its socket object with a
 * bare {node, socket} link that no longer carries the `typeGroup` tag.
 */
export const getTypeGroupMembers = (
    spec: IInteractivityNode | undefined,
    group: string,
): { inputs: string[]; outputs: string[] } => {
    const specInputs = spec?.values?.input ?? {};
    const specOutputs = spec?.values?.output ?? {};
    return {
        inputs: Object.keys(specInputs).filter((name) => specInputs[name].typeGroup === group),
        outputs: Object.keys(specOutputs).filter((name) => specOutputs[name].typeGroup === group),
    };
};

/**
 * Resolve the single concrete type shared by `group` on `node`, from its live model + the spec.
 * Priority (highest first):
 *   1. any unconnected input's own selected type — ground truth, whether it's an explicit dropdown
 *      pick or just holds a static value. A connection must match this, not dictate it: otherwise
 *      picking a new type for one (unconnected) member of the group would keep getting silently
 *      overridden back to a differently-typed sibling's wire, and touching a dropdown could never
 *      visibly "win" without also having to disconnect that sibling — which is not something a type
 *      change should ever do on its own (it may have been an accidental click).
 *   2. only once every member is connected (no unconnected member has a determinable type) — a
 *      connected input adopts its source output socket's type,
 *   3. any grouped socket's stored type (input then output) — the fallback / default.
 * Returns undefined if the group has no members with a determinable type.
 */
export const resolveTypeGroupType = (
    node: IInteractivityNode,
    spec: IInteractivityNode | undefined,
    group: string,
    graphNodes: IInteractivityNode[],
): number | undefined => {
    const { inputs, outputs } = getTypeGroupMembers(spec, group);
    const nodeInputs = node.values?.input ?? {};
    const nodeOutputs = node.values?.output ?? {};

    // 1a. an unconnected input that actually holds a static value is the strongest ground truth —
    // preferred over a sibling that only carries a leftover/placeholder `type` (e.g. a socket the
    // loaded glTF omitted, which falls back to the spec default). This makes resolution independent
    // of socket iteration order, so a group whose typed socket comes *after* an untyped-default one
    // still resolves to the real value's type.
    for (const name of inputs) {
        const socket = nodeInputs[name];
        if (socket === undefined || socket.node !== undefined) { continue; }
        if (socket.value?.[0] != null && socket.type !== undefined) { return socket.type; }
    }
    for (const name of inputs) {
        const socket = nodeInputs[name];
        if (socket === undefined || socket.node !== undefined) { continue; }
        if (socket.type !== undefined) { return socket.type; }
    }
    for (const name of inputs) {
        const socket = nodeInputs[name];
        if (socket?.node !== undefined) {
            const source = graphNodes.find((g) => g.uid === socket.node);
            const sourceType = source?.values?.output?.[socket.socket!]?.type;
            if (sourceType !== undefined) { return sourceType; }
        }
    }
    for (const name of inputs) {
        if (nodeInputs[name]?.type !== undefined) { return nodeInputs[name].type; }
    }
    for (const name of outputs) {
        if (nodeOutputs[name]?.type !== undefined) { return nodeOutputs[name].type; }
    }
    return undefined;
};

/**
 * Resolve the effective type of `node`'s output `socket` for display (socket dot + wire color).
 * A grouped output (e.g. math/add's `value`) adopts its group's resolved type so a wire leaving it
 * matches the colored dot; otherwise it falls back to the socket's own stored type. Mirrors the
 * output-socket resolution in AuthoringGraphNode so wires and dots always agree.
 */
export const resolveOutputSocketType = (
    node: IInteractivityNode | undefined,
    socket: string,
    graphNodes: IInteractivityNode[],
): number | undefined => {
    const value = node?.values?.output?.[socket];
    if (value === undefined) { return undefined; }
    const spec = interactivityNodeSpecs.find((n) => n.op === node!.op);
    const group = value.typeGroup ?? spec?.values?.output?.[socket]?.typeGroup;
    if (group !== undefined) {
        const resolved = resolveTypeGroupType(node!, spec, group, graphNodes);
        if (resolved !== undefined) { return resolved; }
    }
    return value.type;
};

/**
 * Write each typeGroup's resolved concrete type onto the sockets that follow the group on `node` —
 * its grouped outputs, and any grouped input that is neither wired nor carries a static value. This
 * is the model-only equivalent of AuthoringComponent.propagateGroupType, needed when a graph is
 * loaded: the interactive connect / type-dropdown paths keep grouped sockets consistent as the user
 * edits, but loading a glTF sets input sockets straight from the file (and outputs straight from the
 * spec default) with no such propagation, leaving e.g. a math node's output — and any input the file
 * omitted — stuck at the spec-default `int` while the group actually resolves to `float`. That stale
 * stored type then drives a spurious type-group-mismatch warning and a wrong exported output type,
 * even though the socket *displays* the correctly resolved type. Returns true if anything changed.
 */
export const propagateNodeGroupTypes = (
    node: IInteractivityNode,
    graphNodes: IInteractivityNode[],
): boolean => {
    const spec = interactivityNodeSpecs.find((n) => n.op === node.op);
    if (spec === undefined) { return false; }

    const groups = new Set<string>();
    for (const socket of Object.values(spec.values?.input ?? {})) {
        if (socket.typeGroup !== undefined) { groups.add(socket.typeGroup); }
    }
    for (const socket of Object.values(spec.values?.output ?? {})) {
        if (socket.typeGroup !== undefined) { groups.add(socket.typeGroup); }
    }

    let changed = false;
    for (const group of groups) {
        const resolvedType = resolveTypeGroupType(node, spec, group, graphNodes);
        if (resolvedType === undefined) { continue; }
        const { inputs, outputs } = getTypeGroupMembers(spec, group);
        for (const name of inputs) {
            const socket = node.values?.input?.[name];
            if (socket === undefined) { continue; }
            const connected = socket.node !== undefined;
            const hasStatic = !connected && socket.value?.[0] != null;
            if (!connected && !hasStatic && socket.type !== resolvedType) {
                socket.type = resolvedType;
                changed = true;
            }
        }
        for (const name of outputs) {
            const socket = node.values?.output?.[name];
            if (socket === undefined || socket.type === resolvedType) { continue; }
            socket.type = resolvedType;
            changed = true;
        }
    }
    return changed;
};

/**
 * Propagate typeGroup resolution across every node in a freshly loaded graph. Repeats until a full
 * pass makes no change (a change to one node's output can feed a downstream node's wired grouped
 * input), bounded by the node count since each pass advances the resolution by at least one wire.
 */
export const propagateGraphGroupTypes = (graphNodes: IInteractivityNode[]): void => {
    for (let pass = 0; pass < graphNodes.length; pass++) {
        let changed = false;
        for (const node of graphNodes) {
            if (propagateNodeGroupTypes(node, graphNodes)) { changed = true; }
        }
        if (!changed) { break; }
    }
};

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
