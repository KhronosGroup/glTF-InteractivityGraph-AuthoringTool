import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OnStartNode extends BehaveEngineNode {
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "OnStart";
        this.outValues.event = { value: [`/extensions/KHR_interactivity/events/${this.events.length}`], type: this.getTypeIndex('ref') };
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        return super.processNode(flowSocket);
    }
}
