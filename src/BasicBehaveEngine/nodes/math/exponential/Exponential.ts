import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Exponential extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ExponentialNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        let val: any;

        switch (typeA) {
            case "float":
                val = Math.exp(a)
                break;
            case "float3":
                val = [
                    Math.exp(a[0]),
                    Math.exp(a[1]),
                    Math.exp(a[2]),
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        return {'val': {id: "val", value: val, type: typeIndexA}}
    }
}
