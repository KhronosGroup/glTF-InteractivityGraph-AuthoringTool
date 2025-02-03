import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Clamp extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}, c: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ClampNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b, c} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        const typeIndexC = this.values['c'].type!
        const typeC: string = this.getType(typeIndexC);
        if (typeA !== typeB || typeB !== typeC) {
            throw Error("input types not equivalent")
        }
        let val: any;

        switch (typeA) {
            case "int":
            case "float":
                val = [Math.min(Math.max(a,Math.min(b,c)), Math.max(b,c))];
                break;
            case "float2":
                val = [
                    Math.min(Math.max(a[0],Math.min(b[0],c[0])), Math.max(b[0],c[0])),
                    Math.min(Math.max(a[1],Math.min(b[1],c[1])), Math.max(b[1],c[1]))
                ]
                break;
            case "float3":
                val = [
                    Math.min(Math.max(a[0],Math.min(b[0],c[0])), Math.max(b[0],c[0])),
                    Math.min(Math.max(a[1],Math.min(b[1],c[1])), Math.max(b[1],c[1])),
                    Math.min(Math.max(a[2],Math.min(b[2],c[2])), Math.max(b[2],c[2]))
                ]
                break;
            case "float4":
                val = [
                    Math.min(Math.max(a[0],Math.min(b[0],c[0])), Math.max(b[0],c[0])),
                    Math.min(Math.max(a[1],Math.min(b[1],c[1])), Math.max(b[1],c[1])),
                    Math.min(Math.max(a[2],Math.min(b[2],c[2])), Math.max(b[2],c[2])),
                    Math.min(Math.max(a[3],Math.min(b[3],c[3])), Math.max(b[3],c[3]))
                ]
                break
            case "float2x2":
                val = [
                    [Math.min(Math.max(a[0][0],Math.min(b[0][0],c[0][0])), Math.max(b[0][0],c[0][0]))],
                    [Math.min(Math.max(a[1][0],Math.min(b[1][0],c[1][0])), Math.max(b[1][0],c[1][0]))],
                ]
                break
            case "float3x3":
                val = [
                    [Math.min(Math.max(a[0][0],Math.min(b[0][0],c[0][0])), Math.max(b[0][0],c[0][0]))],
                    [Math.min(Math.max(a[1][0],Math.min(b[1][0],c[1][0])), Math.max(b[1][0],c[1][0]))],
                    [Math.min(Math.max(a[2][0],Math.min(b[2][0],c[2][0])), Math.max(b[2][0],c[2][0]))],
                ]
                break
            case "float4x4":
                val = [
                    [Math.min(Math.max(a[0][0],Math.min(b[0][0],c[0][0])), Math.max(b[0][0],c[0][0]))],
                    [Math.min(Math.max(a[1][0],Math.min(b[1][0],c[1][0])), Math.max(b[1][0],c[1][0]))],
                    [Math.min(Math.max(a[2][0],Math.min(b[2][0],c[2][0])), Math.max(b[2][0],c[2][0]))],
                    [Math.min(Math.max(a[3][0],Math.min(b[3][0],c[3][0])), Math.max(b[3][0],c[3][0]))],
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndexA}}
    }
}
