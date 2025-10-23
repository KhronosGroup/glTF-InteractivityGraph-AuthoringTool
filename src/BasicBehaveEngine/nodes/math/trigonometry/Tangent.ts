import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Tangent extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "TangentNode";
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
                val = [Math.tan(a)];
                break;
            case "float2":
                val = [
                    Math.tan(a[0]),
                    Math.tan(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.tan(a[0]),
                    Math.tan(a[1]),
                    Math.tan(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.tan(a[0]),
                    Math.tan(a[1]),
                    Math.tan(a[2]),
                    Math.tan(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.tan(a[0]), Math.tan(a[1]),
                    Math.tan(a[2]), Math.tan(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.tan(a[0]), Math.tan(a[1]), Math.tan(a[2]),
                    Math.tan(a[3]), Math.tan(a[4]), Math.tan(a[5]),
                    Math.tan(a[6]), Math.tan(a[7]), Math.tan(a[8]),
                    Math.tan(a[12]), Math.tan(a[13]), Math.tan(a[14]),
                ]
                break
            case "float4x4":
                val = [
                    Math.tan(a[0]), Math.tan(a[1]), Math.tan(a[2]), Math.tan(a[3]),
                    Math.tan(a[4]), Math.tan(a[5]), Math.tan(a[6]), Math.tan(a[7]),
                    Math.tan(a[8]), Math.tan(a[9]), Math.tan(a[10]), Math.tan(a[11]),
                    Math.tan(a[12]), Math.tan(a[13]), Math.tan(a[14]), Math.tan(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
