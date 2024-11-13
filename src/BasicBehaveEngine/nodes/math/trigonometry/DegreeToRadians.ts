import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class DegreeToRadians extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "DegreeToRadiansNode";
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
                val = [(a * Math.PI) / 180];
                break;
            case "float2":
                val = [
                    (a[0] * Math.PI) / 180,
                    (a[1] * Math.PI) / 180
                ]
                break;
            case "float3":
                val = [
                    (a[0] * Math.PI) / 180,
                    (a[1] * Math.PI) / 180,
                    (a[2] * Math.PI) / 180,
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        return {'val': {id: "val", value: val, type: typeIndex}}
    }
}
