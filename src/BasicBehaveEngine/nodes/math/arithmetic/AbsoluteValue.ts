import {BehaveEngineNode, IBehaviourNodeProps, IValue} from "../../../BehaveEngineNode";

export class AbsoluteValue extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "AbsoluteValueNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string): Record<string, IValue> {
        const {a} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);

        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "int":
                val = [Math.abs(a) | 0];
                break;
            case "float":
                val = [Math.abs(a)];
                break;
            case "float2":
                val = [
                    Math.abs(a[0]),
                    Math.abs(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.abs(a[0]),
                    Math.abs(a[1]),
                    Math.abs(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.abs(a[0]),
                    Math.abs(a[1]),
                    Math.abs(a[2]),
                    Math.abs(a[3]),
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        return {'val': {id: "val", value: val, type: typeIndex}}
    }
}
