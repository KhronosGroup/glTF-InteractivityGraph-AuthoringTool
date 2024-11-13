import {BehaveEngineNode, IBehaviourNodeProps, IValue} from "../../../BehaveEngineNode";

export class IsInfNode extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "IsInfNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string): Record<string, IValue> {
        const {a} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);

        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "float":
                val = !isFinite(Number(a));
                break;
            default:
                throw Error("Invalid type")
        }

        return {'val': {id: "val", value: [val], type: this.getTypeIndex('bool')}}
    }
}
