import { IInteractivityValue } from "../../../../types/InteractivityGraph";
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
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
