import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class SquareRoot extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "SquareRootNode";
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
                val = [Math.sqrt(a)];
                break;
            case "float2":
                val = [
                    Math.sqrt(a[0]),
                    Math.sqrt(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.sqrt(a[0]),
                    Math.sqrt(a[1]),
                    Math.sqrt(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.sqrt(a[0]),
                    Math.sqrt(a[1]),
                    Math.sqrt(a[2]),
                    Math.sqrt(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.sqrt(a[0]), Math.sqrt(a[1]),
                    Math.sqrt(a[2]), Math.sqrt(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.sqrt(a[0]), Math.sqrt(a[1]), Math.sqrt(a[2]),
                    Math.sqrt(a[3]), Math.sqrt(a[4]), Math.sqrt(a[5]),
                    Math.sqrt(a[6]), Math.sqrt(a[7]), Math.sqrt(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.sqrt(a[0]), Math.sqrt(a[1]), Math.sqrt(a[2]), Math.sqrt(a[3]),
                    Math.sqrt(a[4]), Math.sqrt(a[5]), Math.sqrt(a[6]), Math.sqrt(a[7]),
                    Math.sqrt(a[8]), Math.sqrt(a[9]), Math.sqrt(a[10]), Math.sqrt(a[11]),
                    Math.sqrt(a[12]), Math.sqrt(a[13]), Math.sqrt(a[14]), Math.sqrt(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
