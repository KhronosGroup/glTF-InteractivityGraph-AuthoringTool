import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Or extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "OrNode";
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
            case "bool":
                val = JSON.parse(a) || JSON.parse(b);
                break;
            case "int":
                val = a | b;
                break;
            default:
                throw Error("Invalid type")
        }
        return {'value': {value: [val], type: typeIndexA}}
    }
}
