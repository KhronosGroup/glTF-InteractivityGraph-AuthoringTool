import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Clamp extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}, c: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ClampNode";
        this.validateValues(this.values);
    }

    clamp(a: number, b: number, c: number): number {
        return Math.min(Math.max(a,Math.min(b,c)), Math.max(b,c));
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
                val = [this.clamp(a,b,c)];
                break;
            case "float2":
                val = [
                    this.clamp(a[0],b[0],c[0]),
                    this.clamp(a[1],b[1],c[1])
                ]
                break;
            case "float3":
                val = [
                    this.clamp(a[0],b[0],c[0]),
                    this.clamp(a[1],b[1],c[1]),
                    this.clamp(a[2],b[2],c[2])
                ]
                break;
            case "float4":
                val = [
                    this.clamp(a[0],b[0],c[0]),
                    this.clamp(a[1],b[1],c[1]),
                    this.clamp(a[2],b[2],c[2]),
                    this.clamp(a[3],b[3],c[3])
                ]
                break
            case "float2x2":
                val = [
                    this.clamp(a[0],b[0],c[0]),
                    this.clamp(a[1],b[1],c[1]),
                    this.clamp(a[2],b[2],c[2]),
                    this.clamp(a[3],b[3],c[3]),
                ]
                break
            case "float3x3":
                val = [
                    this.clamp(a[0],b[0],c[0]),
                    this.clamp(a[1],b[1],c[1]),
                    this.clamp(a[2],b[2],c[2]),
                    this.clamp(a[3],b[3],c[3]),
                    this.clamp(a[4],b[4],c[4]),
                    this.clamp(a[5],b[5],c[5]),
                    this.clamp(a[6],b[6],c[6]),
                    this.clamp(a[7],b[7],c[7]),
                    this.clamp(a[8],b[8],c[8]),
                ]
                break
            case "float4x4":
                val = [
                    this.clamp(a[0],b[0],c[0]),
                    this.clamp(a[1],b[1],c[1]),
                    this.clamp(a[2],b[2],c[2]),
                    this.clamp(a[3],b[3],c[3]),
                    this.clamp(a[4],b[4],c[4]),
                    this.clamp(a[5],b[5],c[5]),
                    this.clamp(a[6],b[6],c[6]),
                    this.clamp(a[7],b[7],c[7]),
                    this.clamp(a[8],b[8],c[8]),
                    this.clamp(a[9],b[9],c[9]),
                    this.clamp(a[10],b[10],c[10]),
                    this.clamp(a[11],b[11],c[11]),
                    this.clamp(a[12],b[12],c[12]),
                    this.clamp(a[13],b[13],c[13]),
                    this.clamp(a[14],b[14],c[14]),
                    this.clamp(a[15],b[15],c[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndexA}}
    }
}
