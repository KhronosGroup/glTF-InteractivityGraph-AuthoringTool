import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Saturate extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "SaturateNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "float":
                val = Math.min(Math.max(a, 0.0), 1.0);
                break;
            case "float3":
                val = [
                    Math.min(Math.max(a[0], 0.0), 1.0),
                    Math.min(Math.max(a[1], 0.0), 1.0),
                    Math.min(Math.max(a[2], 0.0), 1.0),
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        return {id: "val", value: val, type: typeIndex}
    }
}
