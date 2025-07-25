import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OnStartNode extends BehaveEngineNode {
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "OnStart";
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        return super.processNode(flowSocket);
    }
}
