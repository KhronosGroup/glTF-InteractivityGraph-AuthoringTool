import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Sign extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "SignNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
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
            default:
                throw Error("Invalid type")
        }

        return {'value': {id: "value", value: val, type: typeIndex}}
    }
}
