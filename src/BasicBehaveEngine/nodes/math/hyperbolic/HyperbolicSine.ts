import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class HyperbolicSine extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "HyperbolicSineNode";
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
                val = Math.sinh(a);
                break;
            case "float3":
                val = [
                    Math.sinh(a[0]),
                    Math.sinh(a[1]),
                    Math.sinh(a[2]),
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        return {'val': {id: "val", value: val, type: typeIndex}}
    }
}
