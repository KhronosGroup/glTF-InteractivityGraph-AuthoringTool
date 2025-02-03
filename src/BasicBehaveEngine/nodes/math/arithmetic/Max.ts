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
                    [Math.max(a[0][0], b[0][0]), Math.max(a[0][1], b[0][1])],
                    [Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1])],
                ]
                break
            case "float3x3":
                val = [
                    [Math.max(a[0][0], b[0][0]), Math.max(a[0][1], b[0][1]), Math.max(a[0][2], b[0][2])],
                    [Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1]), Math.max(a[1][2], b[1][2])],
                    [Math.max(a[2][0], b[2][0]), Math.max(a[2][1], b[2][1]), Math.max(a[2][2], b[2][2])],
                ]
                break
            case "float4x4":
                val = [
                    [Math.max(a[0][0], b[0][0]), Math.max(a[0][1], b[0][1]), Math.max(a[0][2], b[0][2]), Math.max(a[0][3], b[0][3])],
                    [Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1]), Math.max(a[1][2], b[1][2]), Math.max(a[1][3], b[1][3])],
                    [Math.max(a[2][0], b[2][0]), Math.max(a[2][1], b[2][1]), Math.max(a[2][2], b[2][2]), Math.max(a[2][3], b[2][3])],
                    [Math.max(a[3][0], b[3][0]), Math.max(a[3][1], b[3][1]), Math.max(a[3][2], b[3][2]), Math.max(a[3][3], b[3][3])],
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndexA}}
    }
}
