import { IInteractivityNode } from "../BasicBehaveEngine/types/InteractivityGraph";
import { RenderIf } from "../components/RenderIf";

export interface TooltipSocketRow {
    socket: string;
    description?: string;
    // NodeIndex (position in graph.nodes) of whatever this socket is wired to. A value-output or
    // flow-input socket can fan out to / in from several other nodes, so this is always a list.
    connectedNodeIndices?: number[];
}

export interface NodeTooltipSections {
    description?: string;
    // the node's position in the graph's node list — the index used by KHR_interactivity node
    // references (e.g. configuration.nodeIndex) elsewhere in the graph. Undefined for a node type
    // that isn't placed on the graph yet (the Add Node picker).
    nodeIndex?: number;
    flowIn: TooltipSocketRow[];
    valueIn: TooltipSocketRow[];
    flowOut: TooltipSocketRow[];
    valueOut: TooltipSocketRow[];
}

// spec-driven sections for a node *type* with no live graph instance (the Add Node picker): op
// description plus every flow/value socket (value sockets include their description, flow sockets
// are name-only since IInteractivityFlow carries no description field), no NodeIndex/connections.
export const buildNodeTypeTooltipSections = (spec: IInteractivityNode | undefined): NodeTooltipSections => {
    if (!spec) { return { flowIn: [], valueIn: [], flowOut: [], valueOut: [] }; }
    return {
        description: spec.description,
        flowIn: Object.keys(spec.flows?.input ?? {}).map((socket) => ({ socket })),
        flowOut: Object.keys(spec.flows?.output ?? {}).map((socket) => ({ socket })),
        valueIn: Object.entries(spec.values?.input ?? {}).map(([socket, value]) => ({ socket, description: value.description })),
        valueOut: Object.entries(spec.values?.output ?? {}).map(([socket, value]) => ({ socket, description: value.description })),
    };
};

const ConnectedIndices = (props: {indices?: number[]; arrow: string}) => (
    <RenderIf shouldShow={(props.indices?.length ?? 0) > 0}>
        <span className="node-info-tooltip-conn"> {props.arrow} Node {(props.indices ?? []).join(", ")}</span>
    </RenderIf>
);

const SocketRows = (props: {rows: TooltipSocketRow[]; arrow: string}) => (
    <>
        {props.rows.map((row) => (
            <div key={row.socket} className="node-info-tooltip-row">
                <span className="node-info-tooltip-socket">{row.socket}</span>
                <RenderIf shouldShow={row.description !== undefined}>
                    <span className="node-info-tooltip-desc"> — {row.description}</span>
                </RenderIf>
                <ConnectedIndices indices={row.connectedNodeIndices} arrow={props.arrow} />
            </div>
        ))}
    </>
);

// Shared, richly-formatted tooltip body: node description, then Flow In / Value In / Flow Out /
// Value Out sections. Used both by the Add Node picker (type-only, no instance data) and the
// graph canvas node header (adds the NodeIndex and, per connected socket, the NodeIndex it's
// wired to).
export const NodeInfoTooltip = (props: {sections: NodeTooltipSections}) => {
    const { sections } = props;
    return (
        <div>
            <RenderIf shouldShow={sections.nodeIndex !== undefined}>
                <div className="node-info-tooltip-index">Node Index: {sections.nodeIndex}</div>
            </RenderIf>
            <RenderIf shouldShow={sections.description !== undefined}>
                <div>{sections.description}</div>
            </RenderIf>
            <RenderIf shouldShow={sections.flowIn.length > 0}>
                <div className="node-info-tooltip-section">Flow In</div>
                <SocketRows rows={sections.flowIn} arrow="←" />
            </RenderIf>
            <RenderIf shouldShow={sections.valueIn.length > 0}>
                <div className="node-info-tooltip-section">Value In</div>
                <SocketRows rows={sections.valueIn} arrow="←" />
            </RenderIf>
            <RenderIf shouldShow={sections.flowOut.length > 0}>
                <div className="node-info-tooltip-section">Flow Out</div>
                <SocketRows rows={sections.flowOut} arrow="→" />
            </RenderIf>
            <RenderIf shouldShow={sections.valueOut.length > 0}>
                <div className="node-info-tooltip-section">Value Out</div>
                <SocketRows rows={sections.valueOut} arrow="→" />
            </RenderIf>
        </div>
    );
};
