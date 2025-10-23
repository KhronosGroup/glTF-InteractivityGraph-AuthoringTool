import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class RadiansToDegrees extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "RadiansToDegreesNode";
        this.validateValues(this.values);
    }

    radiansToDegrees(a: number) {
        return a * 180 / Math.PI;
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "float":
                val = [this.radiansToDegrees(a)];
                break;
            case "float2":
                val = [
                    this.radiansToDegrees(a[0]),
                    this.radiansToDegrees(a[1])
                ]
                break;
            case "float3":
                val = [
                    this.radiansToDegrees(a[0]),
                    this.radiansToDegrees(a[1]),
                    this.radiansToDegrees(a[2]),
                ]
                break;
            case "float4":
                val = [
                    this.radiansToDegrees(a[0]),
                    this.radiansToDegrees(a[1]),
                    this.radiansToDegrees(a[2]),
                    this.radiansToDegrees(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    this.radiansToDegrees(a[0]), this.radiansToDegrees(a[1]),
                    this.radiansToDegrees(a[2]), this.radiansToDegrees(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    this.radiansToDegrees(a[0]), this.radiansToDegrees(a[1]), this.radiansToDegrees(a[2]),
                    this.radiansToDegrees(a[3]), this.radiansToDegrees(a[4]), this.radiansToDegrees(a[5]),
                    this.radiansToDegrees(a[6]), this.radiansToDegrees(a[7]), this.radiansToDegrees(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    this.radiansToDegrees(a[0]), this.radiansToDegrees(a[1]), this.radiansToDegrees(a[2]), this.radiansToDegrees(a[3]),
                    this.radiansToDegrees(a[4]), this.radiansToDegrees(a[5]), this.radiansToDegrees(a[6]), this.radiansToDegrees(a[7]),
                    this.radiansToDegrees(a[8]), this.radiansToDegrees(a[9]), this.radiansToDegrees(a[10]), this.radiansToDegrees(a[11]),
                    this.radiansToDegrees(a[12]), this.radiansToDegrees(a[13]), this.radiansToDegrees(a[14]), this.radiansToDegrees(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
