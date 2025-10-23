import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Sign extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "SignNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);

        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "int":
            case "float":
                val = [Math.sign(a)];
                break;
            case "float2":
                val = [
                    Math.sign(a[0]),
                    Math.sign(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.sign(a[0]),
                    Math.sign(a[1]),
                    Math.sign(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.sign(a[0]),
                    Math.sign(a[1]),
                    Math.sign(a[2]),
                    Math.sign(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.sign(a[0]), Math.sign(a[1]),
                    Math.sign(a[2]), Math.sign(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.sign(a[0]), Math.sign(a[1]), Math.sign(a[2]),
                    Math.sign(a[3]), Math.sign(a[4]), Math.sign(a[5]),
                    Math.sign(a[6]), Math.sign(a[7]), Math.sign(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.sign(a[0]), Math.sign(a[1]), Math.sign(a[2]), Math.sign(a[3]),
                    Math.sign(a[4]), Math.sign(a[5]), Math.sign(a[6]), Math.sign(a[7]),
                    Math.sign(a[8]), Math.sign(a[9]), Math.sign(a[10]), Math.sign(a[11]),
                    Math.sign(a[12]), Math.sign(a[13]), Math.sign(a[14]), Math.sign(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
