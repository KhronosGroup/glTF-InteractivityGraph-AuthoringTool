import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Mix extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}, c: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MixNode";
        this.validateValues(this.values);
    }

    private mix = (a: number, b: number, t: number): number => {
       return a + t * (b - a);
    }

    override processNode(flowSocket?: string) {
        const {a, b, c} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
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
                val = [this.mix(a,b,c)];
                break;
            case "float2":
                val = [
                    this.mix(a[0], b[0], c[0]),
                    this.mix(a[1], b[1], c[1])
                ]
                break;
            case "float3":
                val = [
                    this.mix(a[0], b[0], c[0]),
                    this.mix(a[1], b[1], c[1]),
                    this.mix(a[2], b[2], c[2]),
                ]
                break;
            case "float4":
                val = [
                    this.mix(a[0], b[0], c[0]),
                    this.mix(a[1], b[1], c[1]),
                    this.mix(a[2], b[2], c[2]),
                    this.mix(a[3], b[3], c[3]),
                ]
                break
            case "float2x2":
                val = [
                    this.mix(a[0], b[0], c[0]), this.mix(a[1], b[1], c[1]),
                    this.mix(a[2], b[2], c[2]), this.mix(a[3], b[3], c[3]),
                ]
                break
            case "float3x3":
                val = [
                    this.mix(a[0], b[0], c[0]), this.mix(a[1], b[1], c[1]), this.mix(a[2], b[2], c[2]),
                    this.mix(a[3], b[3], c[3]), this.mix(a[4], b[4], c[4]), this.mix(a[5], b[5], c[5]),
                    this.mix(a[6], b[6], c[6]), this.mix(a[7], b[7], c[7]), this.mix(a[8], b[8], c[8]),
                ]
                break
            case "float4x4":
                val = [
                    this.mix(a[0], b[0], c[0]), this.mix(a[1], b[1], c[1]), this.mix(a[2], b[2], c[2]), this.mix(a[3], b[3], c[3]),
                    this.mix(a[4], b[4], c[4]), this.mix(a[5], b[5], c[5]), this.mix(a[6], b[6], c[6]), this.mix(a[7], b[7], c[7]),
                    this.mix(a[8], b[8], c[8]), this.mix(a[9], b[9], c[9]), this.mix(a[10], b[10], c[10]), this.mix(a[11], b[11], c[11]),
                    this.mix(a[12], b[12], c[12]), this.mix(a[13], b[13], c[13]), this.mix(a[14], b[14], c[14]), this.mix(a[15], b[15], c[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': { value: val, type: typeIndexA}}
    }
}
