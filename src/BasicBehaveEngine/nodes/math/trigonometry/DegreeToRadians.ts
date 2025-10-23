import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class DegreeToRadians extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "DegreeToRadiansNode";
        this.validateValues(this.values);
    }

    degreeToRadians(a: number) {
        return a * Math.PI / 180;
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "float":
                val = [this.degreeToRadians(a)];
                break;
            case "float2":
                val = [
                    this.degreeToRadians(a[0]),
                    this.degreeToRadians(a[1])
                ]
                break;
            case "float3":
                val = [
                    this.degreeToRadians(a[0]),
                    this.degreeToRadians(a[1]),
                    this.degreeToRadians(a[2]),
                ]
                break;
            case "float4":
                val = [
                    this.degreeToRadians(a[0]),
                    this.degreeToRadians(a[1]),
                    this.degreeToRadians(a[2]),
                    this.degreeToRadians(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    this.degreeToRadians(a[0]), this.degreeToRadians(a[1]),
                    this.degreeToRadians(a[2]), this.degreeToRadians(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    this.degreeToRadians(a[0]), this.degreeToRadians(a[1]), this.degreeToRadians(a[2]),
                    this.degreeToRadians(a[3]), this.degreeToRadians(a[4]), this.degreeToRadians(a[5]),
                    this.degreeToRadians(a[6]), this.degreeToRadians(a[7]), this.degreeToRadians(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    this.degreeToRadians(a[0]), this.degreeToRadians(a[1]), this.degreeToRadians(a[2]), this.degreeToRadians(a[3]),
                    this.degreeToRadians(a[4]), this.degreeToRadians(a[5]), this.degreeToRadians(a[6]), this.degreeToRadians(a[7]),
                    this.degreeToRadians(a[8]), this.degreeToRadians(a[9]), this.degreeToRadians(a[10]), this.degreeToRadians(a[11]),
                    this.degreeToRadians(a[12]), this.degreeToRadians(a[13]), this.degreeToRadians(a[14]), this.degreeToRadians(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
