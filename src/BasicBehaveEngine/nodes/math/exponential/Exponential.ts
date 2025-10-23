import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Exponential extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ExponentialNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        let val: any;

        switch (typeA) {
            case "float":
                val = [Math.exp(a)]
                break;
            case "float2":
                val = [
                    Math.exp(a[0]),
                    Math.exp(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.exp(a[0]),
                    Math.exp(a[1]),
                    Math.exp(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.exp(a[0]),
                    Math.exp(a[1]),
                    Math.exp(a[2]),
                    Math.exp(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.exp(a[0]), Math.exp(a[1]),
                    Math.exp(a[2]), Math.exp(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.exp(a[0]), Math.exp(a[1]), Math.exp(a[2]),
                    Math.exp(a[3]), Math.exp(a[4]), Math.exp(a[5]),
                    Math.exp(a[6]), Math.exp(a[7]), Math.exp(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.exp(a[0]), Math.exp(a[1]), Math.exp(a[2]), Math.exp(a[3]),
                    Math.exp(a[4]), Math.exp(a[5]), Math.exp(a[6]), Math.exp(a[7]),
                    Math.exp(a[8]), Math.exp(a[9]), Math.exp(a[10]), Math.exp(a[11]),
                    Math.exp(a[12]), Math.exp(a[13]), Math.exp(a[14]), Math.exp(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndexA}}
    }
}
