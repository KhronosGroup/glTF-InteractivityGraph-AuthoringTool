import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class NotANumber extends BehaveEngineNode {
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "NanNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);

        return {'val': {id: "val", value: [NaN], type: this.getTypeIndex('float')}}
    }
}
