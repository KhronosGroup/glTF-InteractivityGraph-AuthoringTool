// Editor-side graph model. Extends the runtime spec shapes (owned by the engine in
// BasicBehaveEngine/types/InteractivityGraph) with authoring-only members the runtime engine never
// reads. This is the authoring end of the one-way Authoring -> Engine boundary: the editor works on
// AuthoredGraph; the single compile step (getExecutableGraph) projects it down to a runtime
// IInteractivityGraph. No engine code may import this module.
import {
    IInteractivityGraph,
    IInteractivityNode,
    IInteractivityValue,
} from "../../BasicBehaveEngine/types/InteractivityGraph";

export enum NodeSpecFlag {
    // this op's value/flow socket set is partly generated from `configuration` at authoring time
    // (variable ids, JSON-pointer/message template params, custom event params, switch/multiGate/
    // sequence output flows) rather than being fixed by its spec entry - a socket name on an
    // instance of this op that isn't in the spec template is expected, not a violation, so the
    // load-time spec-validity check skips the "unknown socket" check for it (see
    // loadGraphFromJson in InteractivityGraphContext.tsx).
    DynamicSockets = "dynamicSockets",
    // this op has user-managed output flow sockets (author-added and freely renamed, e.g. via the
    // "+"/rename UI) rather than a fixed set or one generated purely from configuration -
    // currently flow/sequence and flow/multiGate. Affects both node rendering (renamable socket
    // labels) and wire-connect validation (AuthoringComponent treats a not-yet-existing output
    // handle on these ops as a flow socket regardless).
    DynamicFlowOutputs = "dynamicFlowOutputs",
}

// Value socket with editor state. `typeGroup` is the spec's shared type variable (e.g. "T"): all
// value sockets on a node sharing a `typeGroup` MUST resolve to the same concrete type. Used by the
// authoring UI to resolve/display socket types; stripped at compile time.
export interface AuthoredValue extends IInteractivityValue {
    description?: string,
    typeGroup?: string,
}

export interface AuthoredNode extends IInteractivityNode {
    uid?: string,
    op?: string,
    // glTF extension that defines this op (e.g. "KHR_node_hoverability"); omitted for core
    // KHR_interactivity ops. Mirrors IInteractivityDeclaration.extension - see toInteractivityDeclaration.
    extension?: string,
    description?: string,
    // authoring-only terms used by the node picker; never serialized into runtime graphs
    aliases?: string[],
    // see NodeSpecFlag
    flags?: NodeSpecFlag[],
    values?: {
        input?: Record<string, AuthoredValue>,
        output?: Record<string, AuthoredValue>
    },
    metadata?: {
        positionX?: number,
        positionY?: number
    }
}

export interface AuthoredGraph extends IInteractivityGraph {
    nodes: AuthoredNode[],
}
