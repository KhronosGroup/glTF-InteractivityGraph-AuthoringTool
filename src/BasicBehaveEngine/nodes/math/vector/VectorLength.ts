import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class VectorLength extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "VectorLengthNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "float2":
            case "float3":
            case "float4":
                val = Math.hypot(...a);
                break;
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: [val], type: this.getTypeIndex('float')}}
    }
}
