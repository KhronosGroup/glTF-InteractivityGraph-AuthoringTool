import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Truncate extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "TruncateNode";
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
                val = [Math.trunc(a)];
                break;
            case "float2":
                val = [
                    Math.trunc(a[0]),
                    Math.trunc(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.trunc(a[0]),
                    Math.trunc(a[1]),
                    Math.trunc(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.trunc(a[0]),
                    Math.trunc(a[1]),
                    Math.trunc(a[2]),
                    Math.trunc(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.trunc(a[0]), Math.trunc(a[1]),
                    Math.trunc(a[2]), Math.trunc(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.trunc(a[0]), Math.trunc(a[1]), Math.trunc(a[2]),
                    Math.trunc(a[3]), Math.trunc(a[4]), Math.trunc(a[5]),
                    Math.trunc(a[6]), Math.trunc(a[7]), Math.trunc(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.trunc(a[0]), Math.trunc(a[1]), Math.trunc(a[2]), Math.trunc(a[3]),
                    Math.trunc(a[4]), Math.trunc(a[5]), Math.trunc(a[6]), Math.trunc(a[7]),
                    Math.trunc(a[8]), Math.trunc(a[9]), Math.trunc(a[10]), Math.trunc(a[11]),
                    Math.trunc(a[12]), Math.trunc(a[13]), Math.trunc(a[14]), Math.trunc(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
