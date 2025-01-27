import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Arctangent extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ArctangentNode";
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
                val = [Math.atan(a)];
                break;
            case "float2":
                val = [
                    Math.atan(a[0]),
                    Math.atan(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.atan(a[0]),
                    Math.atan(a[1]),
                    Math.atan(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.atan(a[0]),
                    Math.atan(a[1]),
                    Math.atan(a[2]),
                    Math.atan(a[3]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
