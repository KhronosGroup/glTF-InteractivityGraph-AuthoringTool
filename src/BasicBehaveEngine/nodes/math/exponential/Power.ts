import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Power extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PowerNode";
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
            case "float":
                val = [Math.pow(a, b)];
                break;
            case "float2":
                val = [
                    Math.pow(a[0], b[0]),
                    Math.pow(a[1], b[1])
                ]
                break;
            case "float3":
                val = [
                    Math.pow(a[0], b[0]),
                    Math.pow(a[1], b[1]),
                    Math.pow(a[2], b[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.pow(a[0], b[0]),
                    Math.pow(a[1], b[1]),
                    Math.pow(a[2], b[2]),
                    Math.pow(a[3], b[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.pow(a[0], b[0]), Math.pow(a[1], b[1]),
                    Math.pow(a[2], b[2]), Math.pow(a[3], b[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.pow(a[0], b[0]), Math.pow(a[1], b[1]), Math.pow(a[2], b[2]),
                    Math.pow(a[3], b[3]), Math.pow(a[4], b[4]), Math.pow(a[5], b[5]),
                    Math.pow(a[6], b[6]), Math.pow(a[7], b[7]), Math.pow(a[8], b[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.pow(a[0], b[0]), Math.pow(a[1], b[1]), Math.pow(a[2], b[2]), Math.pow(a[3], b[3]),
                    Math.pow(a[4], b[4]), Math.pow(a[5], b[5]), Math.pow(a[6], b[6]), Math.pow(a[7], b[7]),
                    Math.pow(a[8], b[8]), Math.pow(a[9], b[9]), Math.pow(a[10], b[10]), Math.pow(a[11], b[11]),
                    Math.pow(a[12], b[12]), Math.pow(a[13], b[13]), Math.pow(a[14], b[14]), Math.pow(a[15], b[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndexA}}
    }
}
