import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";
import { flattenMatrix, unflattenMatrix } from "../../../matrixUtils";

export class Transpose extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "TransposeNode";
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
        const dimension = Number(typeA.charAt(typeA.length - 1))
        const val: number[][] = [];
        const unflattenedA = unflattenMatrix(a, dimension);

        for (let col = 0; col < dimension; col++) {
            val.push([])
            for (let row = 0; row < dimension; row++) {
                val[col].push(unflattenedA[row][col])
            }
        }
        const flattenedVal = flattenMatrix(val);

        return {'value': {value: flattenedVal, type: typeIndexA}}
    }
}
