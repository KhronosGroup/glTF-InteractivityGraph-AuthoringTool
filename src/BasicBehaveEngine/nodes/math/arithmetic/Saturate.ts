import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Saturate extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "SaturateNode";
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
                val = [Math.min(Math.max(a, 0.0), 1.0)];
                break;
            case "float2":
                val = [
                    Math.min(Math.max(a[0], 0.0), 1.0),
                    Math.min(Math.max(a[1], 0.0), 1.0)
                ]
                break;
            case "float3":
                val = [
                    Math.min(Math.max(a[0], 0.0), 1.0),
                    Math.min(Math.max(a[1], 0.0), 1.0),
                    Math.min(Math.max(a[2], 0.0), 1.0),
                ]
                break;
            case "float4":
                val = [
                    Math.min(Math.max(a[0], 0.0), 1.0),
                    Math.min(Math.max(a[1], 0.0), 1.0),
                    Math.min(Math.max(a[2], 0.0), 1.0),
                    Math.min(Math.max(a[3], 0.0), 1.0),
                ]
                break
            case "float2x2":
                val = [
                    [Math.min(Math.max(a[0][0], 0.0), 1.0), Math.min(Math.max(a[0][1], 0.0), 1.0)],
                    [Math.min(Math.max(a[1][0], 0.0), 1.0), Math.min(Math.max(a[1][1], 0.0), 1.0)],
                ]
                break
            case "float3x3":
                val = [
                    [Math.min(Math.max(a[0][0], 0.0), 1.0), Math.min(Math.max(a[0][1], 0.0), 1.0), Math.min(Math.max(a[0][2], 0.0), 1.0)],
                    [Math.min(Math.max(a[1][0], 0.0), 1.0), Math.min(Math.max(a[1][1], 0.0), 1.0), Math.min(Math.max(a[1][2], 0.0), 1.0)],
                    [Math.min(Math.max(a[2][0], 0.0), 1.0), Math.min(Math.max(a[2][1], 0.0), 1.0), Math.min(Math.max(a[2][2], 0.0), 1.0)],
                ]
                break
            case "float4x4":
                val = [
                    [Math.min(Math.max(a[0][0], 0.0), 1.0), Math.min(Math.max(a[0][1], 0.0), 1.0), Math.min(Math.max(a[0][2], 0.0), 1.0), Math.min(Math.max(a[0][3], 0.0), 1.0)],
                    [Math.min(Math.max(a[1][0], 0.0), 1.0), Math.min(Math.max(a[1][1], 0.0), 1.0), Math.min(Math.max(a[1][2], 0.0), 1.0), Math.min(Math.max(a[1][3], 0.0), 1.0)],
                    [Math.min(Math.max(a[2][0], 0.0), 1.0), Math.min(Math.max(a[2][1], 0.0), 1.0), Math.min(Math.max(a[2][2], 0.0), 1.0), Math.min(Math.max(a[2][3], 0.0), 1.0)],
                    [Math.min(Math.max(a[3][0], 0.0), 1.0), Math.min(Math.max(a[3][1], 0.0), 1.0), Math.min(Math.max(a[3][2], 0.0), 1.0), Math.min(Math.max(a[3][3], 0.0), 1.0)],
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
