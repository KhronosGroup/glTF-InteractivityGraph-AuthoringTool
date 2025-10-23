import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Arcsine extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ArcsineNode";
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
                val = [Math.asin(a)];
                break;
            case "float2":
                val = [
                    Math.asin(a[0]),
                    Math.asin(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.asin(a[0]),
                    Math.asin(a[1]),
                    Math.asin(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.asin(a[0]),
                    Math.asin(a[1]),
                    Math.asin(a[2]),
                    Math.asin(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.asin(a[0]), Math.asin(a[1]),
                    Math.asin(a[2]), Math.asin(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.asin(a[0]), Math.asin(a[1]), Math.asin(a[2]),
                    Math.asin(a[3]), Math.asin(a[4]), Math.asin(a[5]),
                    Math.asin(a[6]), Math.asin(a[7]), Math.asin(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.asin(a[0]), Math.asin(a[1]), Math.asin(a[2]), Math.asin(a[3]),
                    Math.asin(a[4]), Math.asin(a[5]), Math.asin(a[6]), Math.asin(a[7]),
                    Math.asin(a[8]), Math.asin(a[9]), Math.asin(a[10]), Math.asin(a[11]),
                    Math.asin(a[12]), Math.asin(a[13]), Math.asin(a[14]), Math.asin(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
