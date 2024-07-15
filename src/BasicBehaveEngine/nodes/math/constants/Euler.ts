import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Euler extends BehaveEngineNode {
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "EulerNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);

        return {'val': {id: "val", value: [Math.E], type: this.getTypeIndex('float')}}
    }
}
