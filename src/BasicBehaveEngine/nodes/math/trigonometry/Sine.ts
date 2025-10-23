import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Sine extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "SineNode";
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
                val = [Math.sin(a)];
                break;
            case "float2":
                val = [
                    Math.sin(a[0]),
                    Math.sin(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.sin(a[0]),
                    Math.sin(a[1]),
                    Math.sin(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.sin(a[0]),
                    Math.sin(a[1]),
                    Math.sin(a[2]),
                    Math.sin(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.sin(a[0]), Math.sin(a[1]),
                    Math.sin(a[2]), Math.sin(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.sin(a[0]), Math.sin(a[1]), Math.sin(a[2]),
                    Math.sin(a[3]), Math.sin(a[4]), Math.sin(a[5]),
                    Math.sin(a[6]), Math.sin(a[7]), Math.sin(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.sin(a[0]), Math.sin(a[1]), Math.sin(a[2]), Math.sin(a[3]),
                    Math.sin(a[4]), Math.sin(a[5]), Math.sin(a[6]), Math.sin(a[7]),
                    Math.sin(a[8]), Math.sin(a[9]), Math.sin(a[10]), Math.sin(a[11]),
                    Math.sin(a[12]), Math.sin(a[13]), Math.sin(a[14]), Math.sin(a[15])
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
