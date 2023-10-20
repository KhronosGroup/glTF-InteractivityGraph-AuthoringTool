import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class Random extends BehaveEngineNode {
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "RandomNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);

        //TODO: get actual type index
        return {id: "val", value: Math.random(), type: 2}
    }
}
