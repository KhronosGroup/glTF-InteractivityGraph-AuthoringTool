import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Tau extends BehaveEngineNode {
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "TauNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);

        return {'value': {value: [2 * Math.PI], type: this.getTypeIndex('float')}}
    }
}
