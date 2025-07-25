import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class InverseHyperbolicCosine extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "InverseHyperbolicCosineNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "float":
                val = [Math.acosh(a)];
                break;
            case "float2":
                val = [
                    Math.acosh(a[0]),
                    Math.acosh(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.acosh(a[0]),
                    Math.acosh(a[1]),
                    Math.acosh(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.acosh(a[0]),
                    Math.acosh(a[1]),
                    Math.acosh(a[2]),
                    Math.acosh(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    [Math.acosh(a[0][0]), Math.acosh(a[0][1])],
                    [Math.acosh(a[1][0]), Math.acosh(a[1][1])],
                ]
                break
            case "float3x3":
                val = [
                    [Math.acosh(a[0][0]), Math.acosh(a[0][1]), Math.acosh(a[0][2])],
                    [Math.acosh(a[1][0]), Math.acosh(a[1][1]), Math.acosh(a[1][2])],
                    [Math.acosh(a[2][0]), Math.acosh(a[2][1]), Math.acosh(a[2][2])],
                ]
                break
            case "float4x4":
                val = [
                    [Math.acosh(a[0][0]), Math.acosh(a[0][1]), Math.acosh(a[0][2]), Math.acosh(a[0][3])],
                    [Math.acosh(a[1][0]), Math.acosh(a[1][1]), Math.acosh(a[1][2]), Math.acosh(a[1][3])],
                    [Math.acosh(a[2][0]), Math.acosh(a[2][1]), Math.acosh(a[2][2]), Math.acosh(a[2][3])],
                    [Math.acosh(a[3][0]), Math.acosh(a[3][1]), Math.acosh(a[3][2]), Math.acosh(a[3][3])],
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
