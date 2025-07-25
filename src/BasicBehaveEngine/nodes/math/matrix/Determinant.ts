import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Determinant extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "DeterminantNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);

        if (typeA !== "float4x4" && typeA !== "float3x3" && typeA !== "float2x2") {
            throw Error("Invalid type")
        }
        let val: any;

        switch (typeA) {
            case "float4x4":
                val = a[0][0] * (
                    a[1][1] * (a[2][2] * a[3][3] - a[2][3] * a[3][2]) -
                    a[1][2] * (a[2][1] * a[3][3] - a[2][3] * a[3][1]) +
                    a[1][3] * (a[2][1] * a[3][2] - a[2][2] * a[3][1])
                ) - a[0][1] * (
                    a[1][0] * (a[2][2] * a[3][3] - a[2][3] * a[3][2]) -
                    a[1][2] * (a[2][0] * a[3][3] - a[2][3] * a[3][0]) +
                    a[1][3] * (a[2][0] * a[3][2] - a[2][2] * a[3][0])
                ) + a[0][2] * (
                    a[1][0] * (a[2][1] * a[3][3] - a[2][3] * a[3][1]) -
                    a[1][1] * (a[2][0] * a[3][3] - a[2][3] * a[3][0]) +
                    a[1][3] * (a[2][0] * a[3][1] - a[2][1] * a[3][0])
                ) - a[0][3] * (
                    a[1][0] * (a[2][1] * a[3][2] - a[2][2] * a[3][1]) -
                    a[1][1] * (a[2][0] * a[3][2] - a[2][2] * a[3][0]) +
                    a[1][2] * (a[2][0] * a[3][1] - a[2][1] * a[3][0])
                );
                break;
            case "float3x3":
                val = a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
                break;
            case "float2x2":
                val = a[0][0] * a[1][1] - a[0][1] * a[1][0];
                break;
        }

        return {'value': {value: [val], type: this.getTypeIndex('float')}}
    }
}
