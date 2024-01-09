import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Inf extends BehaveEngineNode {
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "InfNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);

        return {id: "val", value: Infinity, type: this.getTypeIndex('float')}
    }
}
