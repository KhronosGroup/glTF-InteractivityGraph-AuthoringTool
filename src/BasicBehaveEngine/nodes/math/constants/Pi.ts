import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Pi extends BehaveEngineNode {
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PiNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);

        return {id: "val", value: Math.PI, type: this.getTypeIndex('float')}
    }
}
