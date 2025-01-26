export enum InteractivityValueType {
    INT = "int",
    BOOLEAN = "bool",
    FLOAT = "float",
    FLOAT2 = "float2",
    FLOAT3 = "float3",
    FLOAT4 = "float4",
    FLOAT4X4 = "float4x4",
    CUSTOM = "custom"
}

export interface IInteractivityValueType {
    signature: InteractivityValueType,
    name?: string,
    extensions?: any
}

export interface IInteractivityDecleration {
    op: string
    extension?: string
    inputValueSockets?: Record<string, {
        type: number,
        value?: any
    }>
    outputValueSockets?: Record<string, {
        type: number,
        value?: any
    }>
}

export interface IInteractivityVariable {
    type: number,
    name?: string,
    value?: any
}

export interface IInteractivityEvent {
    id: string,
    values: Record<string, {
        type: number,
        value?: any[]
    }>
}

export enum InteractivityConfigurationValueType {
    INT = "int",
    BOOLEAN = "bool",
    INT_ARR = "int[]",
    STRING = "string",
}

export interface IInteractivityConfigurationValue {
   value?: any[]
}

export interface IInteractivityFlow {
    node?: number,
    socket?: string
}

export interface IInteractivityValue {
    typeOptions: number[],
    type: number,
    value?: any[],
    node?: number,
    socket?: string
    description?: string
}

export interface IInteractivityNode {
    decleration: number,
    description?: string,
    configuration?: Record<string, IInteractivityConfigurationValue>,
    flows?: {
        input?: Record<string, IInteractivityFlow>,
        output?: Record<string, IInteractivityFlow>
    },
    values?: {
        input?: Record<string, IInteractivityValue>,
        output?: Record<string, IInteractivityValue>
    }
}

export interface IInteractivityGraph {
    declerations: IInteractivityDecleration[],
    nodes: IInteractivityNode[],
    types: IInteractivityValueType[],
    events: IInteractivityEvent[],
    variables: IInteractivityVariable[]
}