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
                    [this.mix(a[0][0], b[0][0], c[0][0]), this.mix(a[0][1], b[0][1], c[0][1])],
                    [this.mix(a[1][0], b[1][0], c[1][0]), this.mix(a[1][1], b[1][1], c[1][1])],
                ]
                break
            case "float3x3":
                val = [
                    [this.mix(a[0][0], b[0][0], c[0][0]), this.mix(a[0][1], b[0][1], c[0][1]), this.mix(a[0][2], b[0][2], c[0][2])],
                    [this.mix(a[1][0], b[1][0], c[1][0]), this.mix(a[1][1], b[1][1], c[1][1]), this.mix(a[1][2], b[1][2], c[1][2])],
                    [this.mix(a[2][0], b[2][0], c[2][0]), this.mix(a[2][1], b[2][1], c[2][1]), this.mix(a[2][2], b[2][2], c[2][2])],
                ]
                break
            case "float4x4":
                val = [
                    [this.mix(a[0][0], b[0][0], c[0][0]), this.mix(a[0][1], b[0][1], c[0][1]), this.mix(a[0][2], b[0][2], c[0][2]), this.mix(a[0][3], b[0][3], c[0][3])],
                    [this.mix(a[1][0], b[1][0], c[1][0]), this.mix(a[1][1], b[1][1], c[1][1]), this.mix(a[1][2], b[1][2], c[1][2]), this.mix(a[1][3], b[1][3], c[1][3])],
                    [this.mix(a[2][0], b[2][0], c[2][0]), this.mix(a[2][1], b[2][1], c[2][1]), this.mix(a[2][2], b[2][2], c[2][2]), this.mix(a[2][3], b[2][3], c[2][3])],
                    [this.mix(a[3][0], b[3][0], c[3][0]), this.mix(a[3][1], b[3][1], c[3][1]), this.mix(a[3][2], b[3][2], c[3][2]), this.mix(a[3][3], b[3][3], c[3][3])],
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': { value: val, type: typeIndexA}}
    }
}
