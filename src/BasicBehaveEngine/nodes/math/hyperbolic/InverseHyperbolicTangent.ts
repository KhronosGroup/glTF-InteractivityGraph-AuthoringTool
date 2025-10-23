import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class InverseHyperbolicTangent extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "InverseHyperbolicTangentNode";
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
                val = [Math.atanh(a)];
                break;
            case "float2":
                val = [
                    Math.atanh(a[0]),
                    Math.atanh(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.atanh(a[0]),
                    Math.atanh(a[1]),
                    Math.atanh(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.atanh(a[0]),
                    Math.atanh(a[1]),
                    Math.atanh(a[2]),
                    Math.atanh(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.atanh(a[0]), Math.atanh(a[1]),
                    Math.atanh(a[2]), Math.atanh(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.atanh(a[0]), Math.atanh(a[1]), Math.atanh(a[2]),
                    Math.atanh(a[3]), Math.atanh(a[4]), Math.atanh(a[5]),
                    Math.atanh(a[6]), Math.atanh(a[7]), Math.atanh(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.atanh(a[0]), Math.atanh(a[1]), Math.atanh(a[2]), Math.atanh(a[3]),
                    Math.atanh(a[4]), Math.atanh(a[5]), Math.atanh(a[6]), Math.atanh(a[7]),
                    Math.atanh(a[8]), Math.atanh(a[9]), Math.atanh(a[10]), Math.atanh(a[11]),
                    Math.atanh(a[12]), Math.atanh(a[13]), Math.atanh(a[14]), Math.atanh(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
