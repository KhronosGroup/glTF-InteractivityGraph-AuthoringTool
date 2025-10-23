import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class HyperbolicSine extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "HyperbolicSineNode";
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
                val = [Math.sinh(a)];
                break;
            case "float2":
                val = [
                    Math.sinh(a[0]),
                    Math.sinh(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.sinh(a[0]),
                    Math.sinh(a[1]),
                    Math.sinh(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.sinh(a[0]),
                    Math.sinh(a[1]),
                    Math.sinh(a[2]),
                    Math.sinh(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.sinh(a[0]), Math.sinh(a[1]),
                    Math.sinh(a[2]), Math.sinh(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.sinh(a[0]), Math.sinh(a[1]), Math.sinh(a[2]),
                    Math.sinh(a[3]), Math.sinh(a[4]), Math.sinh(a[5]),
                    Math.sinh(a[6]), Math.sinh(a[7]), Math.sinh(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.sinh(a[0]), Math.sinh(a[1]), Math.sinh(a[2]), Math.sinh(a[3]),
                    Math.sinh(a[4]), Math.sinh(a[5]), Math.sinh(a[6]), Math.sinh(a[7]),
                    Math.sinh(a[8]), Math.sinh(a[9]), Math.sinh(a[10]), Math.sinh(a[11]),
                    Math.sinh(a[12]), Math.sinh(a[13]), Math.sinh(a[14]), Math.sinh(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
