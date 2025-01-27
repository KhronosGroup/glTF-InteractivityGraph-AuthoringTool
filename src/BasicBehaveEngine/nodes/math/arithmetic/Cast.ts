import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Cast extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}
    REQUIRED_CONFIGURATIONS = {castType: {}}


    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CastNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const castType = this.configuration['castType'].value![0]

        const typeIndex = this.getTypeIndex(castType!);
        return {'value': {value: a, type: typeIndex}};
    }
}
