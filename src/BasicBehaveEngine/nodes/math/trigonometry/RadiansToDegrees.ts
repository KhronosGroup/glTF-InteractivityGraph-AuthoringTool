import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class RadiansToDegrees extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "RadiansToDegreesNode";
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
                val = [(a * 180) / Math.PI];
                break;
            case "float2":
                val = [
                    (a[0] * 180) / Math.PI,
                    (a[1] * 180) / Math.PI
                ]
                break;
            case "float3":
                val = [
                    (a[0] * 180) / Math.PI,
                    (a[1] * 180) / Math.PI,
                    (a[2] * 180) / Math.PI,
                ]
                break;
            case "float4":
                val = [
                    (a[0] * 180) / Math.PI,
                    (a[1] * 180) / Math.PI,
                    (a[2] * 180) / Math.PI,
                    (a[3] * 180) / Math.PI,
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
