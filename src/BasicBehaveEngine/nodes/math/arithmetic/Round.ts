import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Round extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "RoundNode";
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
                val = [round(a)];
                break;
            case "float2":
                val = [
                    round(a[0]),
                    round(a[1])
                ]
                break;
            case "float3":
                val = [
                    round(a[0]),
                    round(a[1]),
                    round(a[2]),
                ]
                break;
            case "float4":
                val = [
                    round(a[0]),
                    round(a[1]),
                    round(a[2]),
                    round(a[3]),
                ]
                break;
            case "float2x2":
                val = [
                    round(a[0]), round(a[1]),
                    round(a[2]), round(a[3]),
                ]
                break;
            case "float3x3":
                val = [
                    round(a[0]), round(a[1]), round(a[2]),
                    round(a[3]), round(a[4]), round(a[5]),
                    round(a[6]), round(a[7]), round(a[8]),
                ]
                break;
            case "float4x4":
                val = [
                    round(a[0]), round(a[1]), round(a[2]), round(a[3]),
                    round(a[4]), round(a[5]), round(a[6]), round(a[7]),
                    round(a[8]), round(a[9]), round(a[10]), round(a[11]),
                    round(a[12]), round(a[13]), round(a[14]), round(a[15]),
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        function round(a: number) {
            return a < 0 ? -Math.round(-a) : Math.round(a);
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
