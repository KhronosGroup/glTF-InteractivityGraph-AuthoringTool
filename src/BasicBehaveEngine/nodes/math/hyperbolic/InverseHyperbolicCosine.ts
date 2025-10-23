import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class InverseHyperbolicCosine extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "InverseHyperbolicCosineNode";
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
                val = [Math.acosh(a)];
                break;
            case "float2":
                val = [
                    Math.acosh(a[0]),
                    Math.acosh(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.acosh(a[0]),
                    Math.acosh(a[1]),
                    Math.acosh(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.acosh(a[0]),
                    Math.acosh(a[1]),
                    Math.acosh(a[2]),
                    Math.acosh(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.acosh(a[0]), Math.acosh(a[1]),
                    Math.acosh(a[2]), Math.acosh(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.acosh(a[0]), Math.acosh(a[1]), Math.acosh(a[2]),
                    Math.acosh(a[3]), Math.acosh(a[4]), Math.acosh(a[5]),
                    Math.acosh(a[6]), Math.acosh(a[7]), Math.acosh(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.acosh(a[0]), Math.acosh(a[1]), Math.acosh(a[2]), Math.acosh(a[3]),
                    Math.acosh(a[4]), Math.acosh(a[5]), Math.acosh(a[6]), Math.acosh(a[7]),
                    Math.acosh(a[8]), Math.acosh(a[9]), Math.acosh(a[10]), Math.acosh(a[11]),
                    Math.acosh(a[12]), Math.acosh(a[13]), Math.acosh(a[14]), Math.acosh(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
