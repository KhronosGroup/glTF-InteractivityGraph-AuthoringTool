import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class CubeRoot extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CubeRootNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        // MATRIX TO FIX AND ALL REST EXPONENTIAL
        switch (type) {
            case "float":
                val = [Math.cbrt(a)];
                break;
            case "float2":
                val = [
                    Math.cbrt(a[0]),
                    Math.cbrt(a[1])
                ]
                break;
            case "float3":
                val = [
                    Math.cbrt(a[0]),
                    Math.cbrt(a[1]),
                    Math.cbrt(a[2]),
                ]
                break;
            case "float4":
                val = [
                    Math.cbrt(a[0]),
                    Math.cbrt(a[1]),
                    Math.cbrt(a[2]),
                    Math.cbrt(a[3]),
                ]
                break
            case "float2x2":
                val = [
                    Math.cbrt(a[0]), Math.cbrt(a[1]),
                    Math.cbrt(a[2]), Math.cbrt(a[3]),
                ]
                break
            case "float3x3":
                val = [
                    Math.cbrt(a[0]), Math.cbrt(a[1]), Math.cbrt(a[2]),
                    Math.cbrt(a[3]), Math.cbrt(a[4]), Math.cbrt(a[5]),
                    Math.cbrt(a[6]), Math.cbrt(a[7]), Math.cbrt(a[8]),
                ]
                break
            case "float4x4":
                val = [
                    Math.cbrt(a[0]), Math.cbrt(a[1]), Math.cbrt(a[2]), Math.cbrt(a[3]),
                    Math.cbrt(a[4]), Math.cbrt(a[5]), Math.cbrt(a[6]), Math.cbrt(a[7]),
                    Math.cbrt(a[8]), Math.cbrt(a[9]), Math.cbrt(a[10]), Math.cbrt(a[11]),
                    Math.cbrt(a[12]), Math.cbrt(a[13]), Math.cbrt(a[14]), Math.cbrt(a[15]),
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
