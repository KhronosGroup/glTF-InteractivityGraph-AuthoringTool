import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Fraction extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "FractionNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "float":
                val = [a - Math.floor(a)];
                break;
            case "float2":
                val = [
                    a[0] - Math.floor(a[0]),
                    a[1] - Math.floor(a[1])
                ]
                break;
            case "float3":
                val = [
                    a[0] - Math.floor(a[0]),
                    a[1] - Math.floor(a[1]),
                    a[2] - Math.floor(a[2]),
                ]
                break;
            case "float4":
                val = [
                    a[0] - Math.floor(a[0]),
                    a[1] - Math.floor(a[1]),
                    a[2] - Math.floor(a[2]),
                    a[3] - Math.floor(a[3]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {id: "value", value: val, type: typeIndex}}
    }
}
