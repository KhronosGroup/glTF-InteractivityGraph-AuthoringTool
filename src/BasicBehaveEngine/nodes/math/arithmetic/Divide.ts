import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Divide extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "DivideNode";
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
                val = [(a / b) | 0];
                break;
            case "float":
                val = [a / b];
                break;
            case "float2":
                val = [
                    a[0] / b[0],
                    a[1] / b[1]
                ]
                break;
            case "float3":
                val = [
                    a[0] / b[0],
                    a[1] / b[1],
                    a[2] / b[2],
                ]
                break;
            case "float4":
                val = [
                    a[0] / b[0],
                    a[1] / b[1],
                    a[2] / b[2],
                    a[3] / b[3],
                ]
                break
            case "float2x2":
                val = [
                    [a[0][0] / b[0][0], a[0][1] / b[0][1]],
                    [a[1][0] / b[1][0], a[1][1] / b[1][1]],
                ]
                break
            case "float3x3":
                val = [
                    [a[0][0] / b[0][0], a[0][1] / b[0][1], a[0][2] / b[0][2]],
                    [a[1][0] / b[1][0], a[1][1] / b[1][1], a[1][2] / b[1][2]],
                    [a[2][0] / b[2][0], a[2][1] / b[2][1], a[2][2] / b[2][2]],
                ]
                break
            case "float4x4":
                val = [
                    [a[0][0] / b[0][0], a[0][1] / b[0][1], a[0][2] / b[0][2], a[0][3] / b[0][3]],
                    [a[1][0] / b[1][0], a[1][1] / b[1][1], a[1][2] / b[1][2], a[1][3] / b[1][3]],
                    [a[2][0] / b[2][0], a[2][1] / b[2][1], a[2][2] / b[2][2], a[2][3] / b[2][3]],
                    [a[3][0] / b[3][0], a[3][1] / b[3][1], a[3][2] / b[3][2], a[3][3] / b[3][3]],
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndexA}}
    }
}
