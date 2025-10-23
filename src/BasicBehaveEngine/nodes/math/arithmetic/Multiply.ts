import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Multiply extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MultiplyNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        if (typeA !== typeB) {
            throw Error("input types not equivalent")
        }
        let val: any;

        switch (typeA) {
            case "int":
                val = [Math.imul(a, b)];
                break;
            case "float":
                val = [a * b];
                break;
            case "float2":
                val = [
                    a[0] * b[0],
                    a[1] * b[1]
                ]
                break;
            case "float3":
                val = [
                    a[0] * b[0],
                    a[1] * b[1],
                    a[2] * b[2],
                ]
                break;
            case "float4":
                val = [
                    a[0] * b[0],
                    a[1] * b[1],
                    a[2] * b[2],
                    a[3] * b[3],
                ]
                break
            case "float2x2":
                val = [
                    a[0] * b[0], a[1] * b[1],
                    a[2] * b[2], a[3] * b[3],
                ]
                break
            case "float3x3":
                val = [
                    a[0] * b[0], a[1] * b[1], a[2] * b[2],
                    a[3] * b[3], a[4] * b[4], a[5] * b[5],
                    a[6] * b[6], a[7] * b[7], a[8] * b[8],
                ]
                break
            case "float4x4":
                val = [
                    a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3] * b[3],
                    a[4] * b[4], a[5] * b[5], a[6] * b[6], a[7] * b[7],
                    a[8] * b[8], a[9] * b[9], a[10] * b[10], a[11] * b[11],
                    a[12] * b[12], a[13] * b[13], a[14] * b[14], a[15] * b[15],
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndexA}}
    }
}
