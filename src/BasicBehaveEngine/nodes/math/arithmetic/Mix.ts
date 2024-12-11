import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Mix extends BehaveEngineNode {
    REQUIRED_VALUES = [{ id: "a" }, { id: "b" }, { id: "c"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MixNode";
        this.validateValues(this.values);
    }

    private mix = (a: number, b: number, t: number): number => {
       return a + t * (b - a);
    }

    override processNode(flowSocket?: string) {
        const {a, b, c} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
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
                    this.mix(a[0], b[0], c),
                    this.mix(a[1], b[1], c)
                ]
                break;
            case "float3":
                val = [
                    this.mix(a[0], b[0], c),
                    this.mix(a[1], b[1], c),
                    this.mix(a[2], b[2], c),
                ]
                break;
            case "float4":
                val = [
                    this.mix(a[0], b[0], c),
                    this.mix(a[1], b[1], c),
                    this.mix(a[2], b[2], c),
                    this.mix(a[3], b[3], c),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {id: "value", value: val, type: typeIndexA}}
    }
}
