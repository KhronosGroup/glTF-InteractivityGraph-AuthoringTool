import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";
import { unflattenMatrix } from "../../../matrixUtils";

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
        let val: number;
        let unflattenedA: number[][];

        switch (typeA) {
            case "float4x4":
                unflattenedA = unflattenMatrix(a, 4);
                val = unflattenedA[0][0] * (
                    unflattenedA[1][1] * (unflattenedA[2][2] * unflattenedA[3][3] - unflattenedA[2][3] * unflattenedA[3][2]) -
                    unflattenedA[1][2] * (unflattenedA[2][1] * unflattenedA[3][3] - unflattenedA[2][3] * unflattenedA[3][1]) +
                    unflattenedA[1][3] * (unflattenedA[2][1] * unflattenedA[3][2] - unflattenedA[2][2] * unflattenedA[3][1])
                ) - unflattenedA[0][1] * (
                    unflattenedA[1][0] * (unflattenedA[2][2] * unflattenedA[3][3] - unflattenedA[2][3] * unflattenedA[3][2]) -
                    unflattenedA[1][2] * (unflattenedA[2][0] * unflattenedA[3][3] - unflattenedA[2][3] * unflattenedA[3][0]) +
                    unflattenedA[1][3] * (unflattenedA[2][0] * unflattenedA[3][2] - unflattenedA[2][2] * unflattenedA[3][0])
                ) + unflattenedA[0][2] * (
                    unflattenedA[1][0] * (unflattenedA[2][1] * unflattenedA[3][3] - unflattenedA[2][3] * unflattenedA[3][1]) -
                    unflattenedA[1][1] * (unflattenedA[2][0] * unflattenedA[3][3] - unflattenedA[2][3] * unflattenedA[3][0]) +
                    unflattenedA[1][3] * (unflattenedA[2][0] * unflattenedA[3][1] - unflattenedA[2][1] * unflattenedA[3][0])
                ) - unflattenedA[0][3] * (
                    unflattenedA[1][0] * (unflattenedA[2][1] * unflattenedA[3][2] - unflattenedA[2][2] * unflattenedA[3][1]) -
                    unflattenedA[1][1] * (unflattenedA[2][0] * unflattenedA[3][2] - unflattenedA[2][2] * unflattenedA[3][0]) +
                    unflattenedA[1][2] * (unflattenedA[2][0] * unflattenedA[3][1] - unflattenedA[2][1] * unflattenedA[3][0])
                );
                break;
            case "float3x3":
                unflattenedA = unflattenMatrix(a, 3);
                val = unflattenedA[0][0] * (unflattenedA[1][1] * unflattenedA[2][2] - unflattenedA[1][2] * unflattenedA[2][1]) - unflattenedA[0][1] * (unflattenedA[1][0] * unflattenedA[2][2] - unflattenedA[1][2] * unflattenedA[2][0]) + unflattenedA[0][2] * (unflattenedA[1][0] * unflattenedA[2][1] - unflattenedA[1][1] * unflattenedA[2][0]);
                break;
            case "float2x2":
                unflattenedA = unflattenMatrix(a, 2);
                val = unflattenedA[0][0] * unflattenedA[1][1] - unflattenedA[0][1] * unflattenedA[1][0];
                break;
        }

        return {'value': {value: [val], type: this.getTypeIndex('float')}}
    }
}
