import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class IsInfNode extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "IsInfNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
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

        return {'value': {value: [val], type: this.getTypeIndex('bool')}}
    }
}
