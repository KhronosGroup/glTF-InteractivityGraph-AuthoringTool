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
    /** external identifier; events without one are internal-only (not addressable from outside the graph) */
    id?: string,
    name?: string,
    values?: Record<string, {
        type: number,
        value?: any[]
    }>
}

/**
 * Event-bus channel for a custom event. Events with an `id` use it (external dispatchers address
 * them by id); id-less events are internal-only, so they get an index-keyed channel that can't
 * collide with an id.
 */
export const getCustomEventChannel = (event: IInteractivityEvent | undefined, index: number): string =>
    event?.id ? `KHR_INTERACTIVITY:${event.id}` : `KHR_INTERACTIVITY_INTERNAL:${index}`;

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
}

export interface IInteractivityNode {
    declaration: number,
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
    declarations: IInteractivityDeclaration[],
    nodes: IInteractivityNode[],
    types: IInteractivityValueType[],
    events: IInteractivityEvent[],
    variables: IInteractivityVariable[]
}
