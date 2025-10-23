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
                    Math.min(Math.max(a[0], 0.0), 1.0), Math.min(Math.max(a[1], 0.0), 1.0),
                    Math.min(Math.max(a[2], 0.0), 1.0), Math.min(Math.max(a[3], 0.0), 1.0),
                ]
                break
            case "float3x3":
                val = [
                    Math.min(Math.max(a[0], 0.0), 1.0), Math.min(Math.max(a[1], 0.0), 1.0), Math.min(Math.max(a[2], 0.0), 1.0),
                    Math.min(Math.max(a[3], 0.0), 1.0), Math.min(Math.max(a[4], 0.0), 1.0), Math.min(Math.max(a[5], 0.0), 1.0),
                    Math.min(Math.max(a[6], 0.0), 1.0), Math.min(Math.max(a[7], 0.0), 1.0), Math.min(Math.max(a[8], 0.0), 1.0),
                ]
                break
            case "float4x4":
                val = [
                    Math.min(Math.max(a[0], 0.0), 1.0), Math.min(Math.max(a[1], 0.0), 1.0), Math.min(Math.max(a[2], 0.0), 1.0), Math.min(Math.max(a[3], 0.0), 1.0),
                    Math.min(Math.max(a[4], 0.0), 1.0), Math.min(Math.max(a[5], 0.0), 1.0), Math.min(Math.max(a[6], 0.0), 1.0), Math.min(Math.max(a[7], 0.0), 1.0),
                    Math.min(Math.max(a[8], 0.0), 1.0), Math.min(Math.max(a[9], 0.0), 1.0), Math.min(Math.max(a[10], 0.0), 1.0), Math.min(Math.max(a[11], 0.0), 1.0),
                    Math.min(Math.max(a[12], 0.0), 1.0), Math.min(Math.max(a[13], 0.0), 1.0), Math.min(Math.max(a[14], 0.0), 1.0), Math.min(Math.max(a[15], 0.0), 1.0),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
