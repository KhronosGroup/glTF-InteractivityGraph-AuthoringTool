import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class GreaterThanOrEqualTo extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "GreaterThanOrEqualToNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        if (typeA !== typeB) {
            throw Error("input types not equivalent")
        }
        let val: any;

        switch (typeA) {
            case "int":
            case "float":
                val = a >= b;
                break;
            default:
                throw Error("Invalid type")
        }
        return {'value': {id: "value", value: [val], type: this.getTypeIndex('bool')}};
    }
}
