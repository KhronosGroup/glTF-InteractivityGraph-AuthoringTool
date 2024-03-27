import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Cast extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]
    REQUIRED_CONFIGURATIONS = [{id: "castType"}]


    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CastNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const castType = this.configuration['castType'].value!

        const typeIndex = this.getTypeIndex(castType!);
        return {id: "val", value: a, type: typeIndex}
    }
}
