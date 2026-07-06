export enum InteractivityValueType {
    INT = "int",
    BOOLEAN = "bool",
    FLOAT = "float",
    FLOAT2 = "float2",
    FLOAT3 = "float3",
    FLOAT4 = "float4",
    FLOAT2X2 = "float2x2",
    FLOAT3X3 = "float3x3",
    FLOAT4X4 = "float4x4",
    CUSTOM = "custom",
    REF = "ref"
}

export interface IInteractivityValueType {
    signature: InteractivityValueType,
    name?: string,
    extensions?: any
}

export interface IInteractivityDeclaration {
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
    value?: any[]
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
   type?: InteractivityConfigurationValueType
   description?: string
   value?: any[]
   defaultValue?: any[]
}

export interface IInteractivityFlow {
    node?: number | string,
    socket?: string
}

export interface IInteractivityValue {
    typeOptions?: number[],
    type?: number,
    value?: any[],
    node?: number | string,
    socket?: string
    description?: string
    /**
     * Optional type-group tag (the spec's shared type variable, e.g. "T"). All value sockets on the
     * same node that share a `typeGroup` MUST resolve to the same concrete type (mirroring the
     * KHR_interactivity rule that all `floatN`/`floatNxN` sockets have the same type within a node).
     * Sockets with a fixed type, or unrelated types, simply omit this field. Purely additive metadata
     * used by the authoring UI to resolve/display socket types; ignored by the runtime engine.
     */
    typeGroup?: string
}

export interface IInteractivityNode {
    uid?: string,
    op?: string,
    declaration: number,
    description?: string,
    configuration?: Record<string, IInteractivityConfigurationValue>,
    flows?: {
        input?: Record<string, IInteractivityFlow>,
        output?: Record<string, IInteractivityFlow>
    },
    values?: {
        input?: Record<string, IInteractivityValue>,
        output?: Record<string, IInteractivityValue>
    },
    metadata?: {
        positionX?: number,
        positionY?: number
    }
}

export interface IInteractivityGraph {
    declarations: IInteractivityDeclaration[],
    nodes: IInteractivityNode[],
    types: IInteractivityValueType[],
    events: IInteractivityEvent[],
    variables: IInteractivityVariable[]
}
