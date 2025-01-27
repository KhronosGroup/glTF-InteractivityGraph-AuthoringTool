import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class FloatToInt extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "FloatToInt";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);

        if (type !== "float") {
            throw Error("Invalid type")
        }

        const val: number = a|0;


        return {'value': {value: [val], type: this.getTypeIndex('int')}}
    }
}
