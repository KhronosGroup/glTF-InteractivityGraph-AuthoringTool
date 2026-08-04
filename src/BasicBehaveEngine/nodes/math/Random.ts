import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class Random extends BehaveEngineNode {
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "RandomNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);

        return {'value': {id: "value", value: [Math.random()], type: this.getTypeIndex('float')}}
    }
}
