import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Cosine extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CosineNode";
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
                val = [Math.cos(a)];
                break;
            case "float2":
                val = [
                    Math.cos(a[0]),
                    Math.cos(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.cos(a[0]),
                    Math.cos(a[1]),
                    Math.cos(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.cos(a[0]),
                    Math.cos(a[1]),
                    Math.cos(a[2]),
                    Math.cos(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.cos(a[0]), Math.cos(a[1]),
                    Math.cos(a[2]), Math.cos(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.cos(a[0]), Math.cos(a[1]), Math.cos(a[2]),
                    Math.cos(a[3]), Math.cos(a[4]), Math.cos(a[5]),
                    Math.cos(a[6]), Math.cos(a[7]), Math.cos(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.cos(a[0]), Math.cos(a[1]), Math.cos(a[2]), Math.cos(a[3]),
                    Math.cos(a[4]), Math.cos(a[5]), Math.cos(a[6]), Math.cos(a[7]),
                    Math.cos(a[8]), Math.cos(a[9]), Math.cos(a[10]), Math.cos(a[11]),
                    Math.cos(a[12]), Math.cos(a[13]), Math.cos(a[14]), Math.cos(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
