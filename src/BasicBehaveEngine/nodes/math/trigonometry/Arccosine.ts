import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Arccosine extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ArccosineNode";
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
                val = [Math.acos(a)];
                break;
            case "float2":
                val = [
                    Math.acos(a[0]),
                    Math.acos(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.acos(a[0]),
                    Math.acos(a[1]),
                    Math.acos(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.acos(a[0]),
                    Math.acos(a[1]),
                    Math.acos(a[2]),
                    Math.acos(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.acos(a[0]), Math.acos(a[1]),
                    Math.acos(a[2]), Math.acos(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.acos(a[0]), Math.acos(a[1]), Math.acos(a[2]),
                    Math.acos(a[3]), Math.acos(a[4]), Math.acos(a[5]),
                    Math.acos(a[6]), Math.acos(a[7]), Math.acos(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.acos(a[0]), Math.acos(a[1]), Math.acos(a[2]), Math.acos(a[3]),
                    Math.acos(a[4]), Math.acos(a[5]), Math.acos(a[6]), Math.acos(a[7]),
                    Math.acos(a[8]), Math.acos(a[9]), Math.acos(a[10]), Math.acos(a[11]),
                    Math.acos(a[12]), Math.acos(a[13]), Math.acos(a[14]), Math.acos(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
