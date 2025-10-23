import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Floor extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "FloorNode";
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
                val = [Math.floor(a)];
                break;
            case "float2":
                val = [
                    Math.floor(a[0]),
                    Math.floor(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.floor(a[0]),
                    Math.floor(a[1]),
                    Math.floor(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.floor(a[0]),
                    Math.floor(a[1]),
                    Math.floor(a[2]),
                    Math.floor(a[3]),
                ]
                break;
            case "float2x2":
                val = [
                    Math.floor(a[0]), Math.floor(a[1]),
                    Math.floor(a[2]), Math.floor(a[3]),
                ]
                break;
            case "float3x3":
                val = [
                    Math.floor(a[0]), Math.floor(a[1]), Math.floor(a[2]),
                    Math.floor(a[3]), Math.floor(a[4]), Math.floor(a[5]),
                    Math.floor(a[6]), Math.floor(a[7]), Math.floor(a[8]),
                ]
                break;
            case "float4x4":
                val = [
                    Math.floor(a[0]), Math.floor(a[1]), Math.floor(a[2]), Math.floor(a[3]),
                    Math.floor(a[4]), Math.floor(a[5]), Math.floor(a[6]), Math.floor(a[7]),
                    Math.floor(a[8]), Math.floor(a[9]), Math.floor(a[10]), Math.floor(a[11]),
                    Math.floor(a[12]), Math.floor(a[13]), Math.floor(a[14]), Math.floor(a[15]),
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
