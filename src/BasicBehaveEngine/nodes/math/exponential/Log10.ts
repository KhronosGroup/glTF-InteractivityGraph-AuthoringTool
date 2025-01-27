import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Log10 extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Log2Node";
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
                val = [Math.log10(a)];
                break;
            case "float2":
                val = [
                    Math.log10(a[0]),
                    Math.log10(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.log10(a[0]),
                    Math.log10(a[1]),
                    Math.log10(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.log10(a[0]),
                    Math.log10(a[1]),
                    Math.log10(a[2]),
                    Math.log10(a[3]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
