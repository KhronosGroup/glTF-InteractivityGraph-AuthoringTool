import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Arctangent2 extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Arctangent2Node";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeAIndex = this.values['a'].type!
        const typeA: string = this.getType(typeAIndex);
        const typeBIndex = this.values['b'].type!
        const typeB: string = this.getType(typeBIndex);
        if (typeA !== typeB) {
            throw Error("input types not equivalent")
        }
        let val: any;

        switch (typeA) {
            case "float":
                val = [Math.atan2(a, b)];
                break;
            case "float2":
                val = [
                    Math.atan2(a[0], b[0]),
                    Math.atan2(a[1], b[1])
                ]
                break;
            case "float3":
                val = [
                    Math.atan2(a[0], b[0]),
                    Math.atan2(a[1], b[1]),
                    Math.atan2(a[2], b[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.atan2(a[0], b[0]),
                    Math.atan2(a[1], b[1]),
                    Math.atan2(a[2], b[2]),
                    Math.atan2(a[3], b[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.atan2(a[0], b[0]), Math.atan2(a[1], b[1]),
                    Math.atan2(a[2], b[2]), Math.atan2(a[3], b[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.atan2(a[0], b[0]), Math.atan2(a[1], b[1]), Math.atan2(a[2], b[2]),
                    Math.atan2(a[3], b[3]), Math.atan2(a[4], b[4]), Math.atan2(a[5], b[5]),
                    Math.atan2(a[6], b[6]), Math.atan2(a[7], b[7]), Math.atan2(a[8], b[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.atan2(a[0], b[0]), Math.atan2(a[1], b[1]), Math.atan2(a[2], b[2]), Math.atan2(a[3], b[3]),
                    Math.atan2(a[4], b[4]), Math.atan2(a[5], b[5]), Math.atan2(a[6], b[6]), Math.atan2(a[7], b[7]),
                    Math.atan2(a[8], b[8]), Math.atan2(a[9], b[9]), Math.atan2(a[10], b[10]), Math.atan2(a[11], b[11]),
                    Math.atan2(a[12], b[12]), Math.atan2(a[13], b[13]), Math.atan2(a[14], b[14]), Math.atan2(a[15], b[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeAIndex}}
    }
}
