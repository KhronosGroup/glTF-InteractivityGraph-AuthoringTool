import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Max extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MaxNode";
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
            case "float":
                val = [Math.max(a,b)];
                break;
            case "float2":
                val = [
                    Math.max(a[0], b[0]),
                    Math.max(a[1], b[1])
                ]
                break;
            case "float3":
                val = [
                    Math.max(a[0], b[0]),
                    Math.max(a[1], b[1]),
                    Math.max(a[2], b[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.max(a[0], b[0]),
                    Math.max(a[1], b[1]),
                    Math.max(a[2], b[2]),
                    Math.max(a[3], b[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.max(a[0], b[0]), Math.max(a[1], b[1]),
                    Math.max(a[2], b[2]), Math.max(a[3], b[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]),
                    Math.max(a[3], b[3]), Math.max(a[4], b[4]), Math.max(a[5], b[5]),
                    Math.max(a[6], b[6]), Math.max(a[7], b[7]), Math.max(a[8], b[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3]),
                    Math.max(a[4], b[4]), Math.max(a[5], b[5]), Math.max(a[6], b[6]), Math.max(a[7], b[7]),
                    Math.max(a[8], b[8]), Math.max(a[9], b[9]), Math.max(a[10], b[10]), Math.max(a[11], b[11]),
                    Math.max(a[12], b[12]), Math.max(a[13], b[13]), Math.max(a[14], b[14]), Math.max(a[15], b[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndexA}}
    }
}
