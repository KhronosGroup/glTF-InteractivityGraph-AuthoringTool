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
                    [a[0][0] - Math.floor(a[0][0]), a[0][1] - Math.floor(a[0][1])],
                    [a[1][0] - Math.floor(a[1][0]), a[1][1] - Math.floor(a[1][1])],
                ]
                break
            case "float3x3":
                val = [
                    [a[0][0] - Math.floor(a[0][0]), a[0][1] - Math.floor(a[0][1]), a[0][2] - Math.floor(a[0][2])],
                    [a[1][0] - Math.floor(a[1][0]), a[1][1] - Math.floor(a[1][1]), a[1][2] - Math.floor(a[1][2])],
                    [a[2][0] - Math.floor(a[2][0]), a[2][1] - Math.floor(a[2][1]), a[2][2] - Math.floor(a[2][2])],
                ]
                break
            case "float4x4":
                val = [
                    [a[0][0] - Math.floor(a[0][0]), a[0][1] - Math.floor(a[0][1]), a[0][2] - Math.floor(a[0][2]), a[0][3] - Math.floor(a[0][3])],
                    [a[1][0] - Math.floor(a[1][0]), a[1][1] - Math.floor(a[1][1]), a[1][2] - Math.floor(a[1][2]), a[1][3] - Math.floor(a[1][3])],
                    [a[2][0] - Math.floor(a[2][0]), a[2][1] - Math.floor(a[2][1]), a[2][2] - Math.floor(a[2][2]), a[2][3] - Math.floor(a[2][3])],
                    [a[3][0] - Math.floor(a[3][0]), a[3][1] - Math.floor(a[3][1]), a[3][2] - Math.floor(a[3][2]), a[3][3] - Math.floor(a[3][3])],
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
