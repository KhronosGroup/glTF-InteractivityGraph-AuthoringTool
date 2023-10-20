import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Power extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}, {id: "b"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PowerNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
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
            case "float":
                val = Math.pow(a, b);
                break;
            case "float3":
                val = [
                    Math.pow(a[0], b[0]),
                    Math.pow(a[1], b[1]),
                    Math.pow(a[2], b[2]),
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        return {id: "val", value: val, type: typeIndexA}
    }
}
