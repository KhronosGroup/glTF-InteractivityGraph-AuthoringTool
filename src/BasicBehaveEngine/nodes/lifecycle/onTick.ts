import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OnTickNode extends BehaveEngineNode {
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "OnTick";
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        return super.processNode(flowSocket);
    }
}
