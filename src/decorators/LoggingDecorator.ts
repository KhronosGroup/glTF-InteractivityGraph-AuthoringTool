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
    }

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
