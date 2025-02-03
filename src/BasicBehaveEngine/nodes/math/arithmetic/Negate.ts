import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Negate extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "NegateNode";
        this.validateValues(this.values);
    }

    negate(a: number) {
        return (-a) | 0;
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "int":
                val = [(-a) | 0];
                break;
            case "float":
                val = [a * -1];
                break;
            case "float2":
                val = [
                    a[0] * -1,
                    a[1] * -1
                ]
                break;
            case "float3":
                val = [
                    a[0] * -1,
                    a[1] * -1,
                    a[2] * -1,
                ]
                break;
            case "float4":
                val = [
                    a[0] * -1,
                    a[1] * -1,
                    a[2] * -1,
                    a[3] * -1,
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
