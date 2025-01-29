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
                val = [a < 0 ? -Math.round(-a) : Math.round(a)];
                break;
            case "float2":
                val = [
                    a[0] < 0 ? -Math.round(-a[0]) : Math.round(a[0]),
                    a[1] < 0 ? -Math.round(-a[1]) : Math.round(a[1])
                ]
                break;
            case "float3":
                val = [
                    a[0] < 0 ? -Math.round(-a[0]) : Math.round(a[0]),
                    a[1] < 0 ? -Math.round(-a[1]) : Math.round(a[1]),
                    a[2] < 0 ? -Math.round(-a[2]) : Math.round(a[2]),
                ]
                break;
            case "float4":
                val = [
                    a[0] < 0 ? -Math.round(-a[0]) : Math.round(a[0]),
                    a[1] < 0 ? -Math.round(-a[1]) : Math.round(a[1]),
                    a[2] < 0 ? -Math.round(-a[2]) : Math.round(a[2]),
                    a[3] < 0 ? -Math.round(-a[3]) : Math.round(a[3]),
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
