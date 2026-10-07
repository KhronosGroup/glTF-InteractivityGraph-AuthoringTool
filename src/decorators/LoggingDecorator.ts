import { BehaveEngineNode } from "../BasicBehaveEngine/BehaveEngineNode";
import { IBehaveEngine } from "../BasicBehaveEngine/IBehaveEngine";
import { IInteractivityFlow } from "../BasicBehaveEngine/types/InteractivityGraph";
import { GlTFObjectModelDecorator, GlTFObjectModel } from "../objectModel/glTFObjectModel";

export class LoggingDecorator extends GlTFObjectModelDecorator {
    addToLog: (line: string) => void;

    constructor(behaveEngine: IBehaveEngine, addToLog: (line: string) => void, objectModel: Partial<GlTFObjectModel> = {}) {
        super(behaveEngine, objectModel);
        this.addToLog = addToLog;
        this.behaveEngine.processAddingNodeToQueue = this.processAddingNodeToQueue;
        this.behaveEngine.processExecutingNextNode = this.processExecutingNextNode;
        this.behaveEngine.processNodeStarted = this.processNodeStarted;
        this.behaveEngine.processDebugLog = this.processDebugLog;
    }

    // KHR_node_selectability / KHR_node_hoverability: a node can be hit if it has geometry and neither it nor an
    // ancestor has the flag set to false (a missing extension counts as true); reads the current runtime values
    getInteractableNodes = (extension: "KHR_node_selectability" | "KHR_node_hoverability"): {index: number, name?: string}[] => {
        const property = extension === "KHR_node_selectability" ? "selectable" : "hoverable";
        const isEnabled = (nodeIndex: number): boolean => {
            for (let i: number | undefined = nodeIndex; i !== undefined; i = this.getParentNodeIndex(i)) {
                if (this.getPathValue(`/nodes/${i}/extensions/${extension}/${property}`)?.[0] === false) {
                    return false;
                }
            }
            return true;
        };
        return this.objectModel.nodes.flatMap((node, index) => (
            node?.mesh !== undefined && isEnabled(index) ? [{index, name: node.name}] : []
        ));
    };

    // debug/log output goes to the log panel instead of the browser console
    processDebugLog = (node: BehaveEngineNode, message: string, severity: number): void => {
        const level = ["log", "warn", "error"][severity] ?? `severity ${severity}`;
        this.addToLog(`[debug/log #${node.index} ${level}] ${message}`);
    };

    processAddingNodeToQueue = (flow: IInteractivityFlow): void => {
        this.addToLog(`Adding ${JSON.stringify(flow)} flow to queue`);
    };

    processExecutingNextNode = (flow: IInteractivityFlow): void => {
        this.addToLog(`Executing ${JSON.stringify(flow)} flow`);
    };

    processNodeStarted = (node: BehaveEngineNode): void => {
        this.addToLog(`Running #${node.index} ${node.name}: input values: ${JSON.stringify(node.values)}, output flows: ${JSON.stringify(node.flows)}`);
    };
}
