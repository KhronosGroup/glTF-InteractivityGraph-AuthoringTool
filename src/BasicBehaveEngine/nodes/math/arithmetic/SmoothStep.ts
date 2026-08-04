import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class SmoothStep extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}, c: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "SmoothStepNode";
        this.validateValues(this.values);
    }

    private saturate = (x: number): number => {
        return Math.min(Math.max(x, 0), 1);
    }

    private smoothStep = (a: number, b: number, c: number): number => {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const diff = Math.abs(b - a);
        if (diff === 0) { return 0; }
        const t = this.saturate((c - lo) / diff);
        return t * t * (3 - 2 * t);
    }

    override processNode(flowSocket?: string) {
        const {a, b, c} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!;
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!;
        const typeB: string = this.getType(typeIndexB);

        if (typeA !== typeB) {
            throw Error("input types not equivalent");
        }

        let val: any;

        switch (typeA) {
            case "float":
                val = [this.smoothStep(a, b, c)];
                break;
            case "float2":
                val = [
                    this.smoothStep(a[0], b[0], c[0]),
                    this.smoothStep(a[1], b[1], c[1])
                ];
                break;
            case "float3":
                val = [
                    this.smoothStep(a[0], b[0], c[0]),
                    this.smoothStep(a[1], b[1], c[1]),
                    this.smoothStep(a[2], b[2], c[2])
                ];
                break;
            case "float4":
                val = [
                    this.smoothStep(a[0], b[0], c[0]),
                    this.smoothStep(a[1], b[1], c[1]),
                    this.smoothStep(a[2], b[2], c[2]),
                    this.smoothStep(a[3], b[3], c[3])
                ];
                break;
            default:
                throw Error("Invalid type");
        }

        return {'value': {value: val, type: typeIndexA}};
    }
}
