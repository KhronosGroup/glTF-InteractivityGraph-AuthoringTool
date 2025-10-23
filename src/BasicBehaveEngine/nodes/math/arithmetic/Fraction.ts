import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Fraction extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "FractionNode";
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
            case "float2x2":
                val = [
                    a[0] - Math.floor(a[0]), a[1] - Math.floor(a[1]),
                    a[2] - Math.floor(a[2]), a[3] - Math.floor(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    a[0] - Math.floor(a[0]), a[1] - Math.floor(a[1]), a[2] - Math.floor(a[2]),
                    a[3] - Math.floor(a[3]), a[4] - Math.floor(a[4]), a[5] - Math.floor(a[5]),
                    a[6] - Math.floor(a[6]), a[7] - Math.floor(a[7]), a[8] - Math.floor(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    a[0] - Math.floor(a[0]), a[1] - Math.floor(a[1]), a[2] - Math.floor(a[2]), a[3] - Math.floor(a[3]),
                    a[4] - Math.floor(a[4]), a[5] - Math.floor(a[5]), a[6] - Math.floor(a[6]), a[7] - Math.floor(a[7]),
                    a[8] - Math.floor(a[8]), a[9] - Math.floor(a[9]), a[10] - Math.floor(a[10]), a[11] - Math.floor(a[11]),
                    a[12] - Math.floor(a[12]), a[13] - Math.floor(a[13]), a[14] - Math.floor(a[14]), a[15] - Math.floor(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
