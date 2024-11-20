import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class IntToBool extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "IntToBool";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);

        if (type !== "int") {
            throw Error("Invalid type")
        }

        const val = !!a;


        return {'value': {id: "value", value: [val], type: this.getTypeIndex('bool')}}
    }
}
