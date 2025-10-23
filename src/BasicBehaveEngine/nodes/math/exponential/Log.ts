import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Log extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "LogNode";
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
                val = [Math.log(a)];
                break;
            case "float2":
                val = [
                    Math.log(a[0]),
                    Math.log(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.log(a[0]),
                    Math.log(a[1]),
                    Math.log(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.log(a[0]),
                    Math.log(a[1]),
                    Math.log(a[2]),
                    Math.log(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.log(a[0]), Math.log(a[1]),
                    Math.log(a[2]), Math.log(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.log(a[0]), Math.log(a[1]), Math.log(a[2]),
                    Math.log(a[3]), Math.log(a[4]), Math.log(a[5]),
                    Math.log(a[6]), Math.log(a[7]), Math.log(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.log(a[0]), Math.log(a[1]), Math.log(a[2]), Math.log(a[3]),
                    Math.log(a[4]), Math.log(a[5]), Math.log(a[6]), Math.log(a[7]),
                    Math.log(a[8]), Math.log(a[9]), Math.log(a[10]), Math.log(a[11]),
                    Math.log(a[12]), Math.log(a[13]), Math.log(a[14]), Math.log(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
