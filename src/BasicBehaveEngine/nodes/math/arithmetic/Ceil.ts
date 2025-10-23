import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Ceil extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CeilNode";
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
                val = [Math.ceil(a)];
                break;
            case "float2":
                val = [
                    Math.ceil(a[0]),
                    Math.ceil(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.ceil(a[0]),
                    Math.ceil(a[1]),
                    Math.ceil(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.ceil(a[0]),
                    Math.ceil(a[1]),
                    Math.ceil(a[2]),
                    Math.ceil(a[3]),
                ]
                break;
            case "float2x2":
                val = [
                    [Math.ceil(a[0]), Math.ceil(a[1])],
                    [Math.ceil(a[2]), Math.ceil(a[3])],
                ]
                break;
            case "float3x3":
                val = [
                    [Math.ceil(a[0]), Math.ceil(a[1]), Math.ceil(a[2])],
                    [Math.ceil(a[3]), Math.ceil(a[4]), Math.ceil(a[5])],
                    [Math.ceil(a[6]), Math.ceil(a[7]), Math.ceil(a[8])],
                ]
                break;
            case "float4x4":
                val = [
                    [Math.ceil(a[0]), Math.ceil(a[1]), Math.ceil(a[2]), Math.ceil(a[3])],
                    [Math.ceil(a[4]), Math.ceil(a[5]), Math.ceil(a[6]), Math.ceil(a[7])],
                    [Math.ceil(a[8]), Math.ceil(a[9]), Math.ceil(a[10]), Math.ceil(a[11])],
                    [Math.ceil(a[12]), Math.ceil(a[13]), Math.ceil(a[14]), Math.ceil(a[15])],
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
