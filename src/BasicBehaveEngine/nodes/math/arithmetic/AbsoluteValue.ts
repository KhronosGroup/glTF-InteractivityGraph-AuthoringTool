import { IInteractivityValue } from "../../../types/InteractivityGraph";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class AbsoluteValue extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "AbsoluteValueNode";
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
            case "float2x2":
                val = [
                    Math.abs(a[0]), Math.abs(a[1]),
                    Math.abs(a[2]), Math.abs(a[3]),
                ]
                break;
            case "float3x3":
                val = [
                    Math.abs(a[0]), Math.abs(a[1]), Math.abs(a[2]),
                    Math.abs(a[3]), Math.abs(a[4]), Math.abs(a[5]),
                    Math.abs(a[6]), Math.abs(a[7]), Math.abs(a[8]),
                ]
                break;
            case "float4x4":
                val = [
                    Math.abs(a[0]), Math.abs(a[1]), Math.abs(a[2]), Math.abs(a[3]),
                    Math.abs(a[4]), Math.abs(a[5]), Math.abs(a[6]), Math.abs(a[7]),
                    Math.abs(a[8]), Math.abs(a[9]), Math.abs(a[10]), Math.abs(a[11]),
                    Math.abs(a[12]), Math.abs(a[13]), Math.abs(a[14]), Math.abs(a[15]),
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
