import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class HyperbolicCosine extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "HyperbolicCosineNode";
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
                val = [Math.cosh(a)];
                break;
            case "float2":
                val = [
                    Math.cosh(a[0]),
                    Math.cosh(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.cosh(a[0]),
                    Math.cosh(a[1]),
                    Math.cosh(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.cosh(a[0]),
                    Math.cosh(a[1]),
                    Math.cosh(a[2]),
                    Math.cosh(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.cosh(a[0]), Math.cosh(a[1]),
                    Math.cosh(a[2]), Math.cosh(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.cosh(a[0]), Math.cosh(a[1]), Math.cosh(a[2]),
                    Math.cosh(a[3]), Math.cosh(a[4]), Math.cosh(a[5]),
                    Math.cosh(a[6]), Math.cosh(a[7]), Math.cosh(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.cosh(a[0]), Math.cosh(a[1]), Math.cosh(a[2]), Math.cosh(a[3]),
                    Math.cosh(a[4]), Math.cosh(a[5]), Math.cosh(a[6]), Math.cosh(a[7]),
                    Math.cosh(a[8]), Math.cosh(a[9]), Math.cosh(a[10]), Math.cosh(a[11]),
                    Math.cosh(a[12]), Math.cosh(a[13]), Math.cosh(a[14]), Math.cosh(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
