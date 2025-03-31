import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";
import * as glMatrix from 'gl-matrix';
export class MatMul extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MatMul";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);

        const validTypePairings = (typeA === "float4x4" && typeB === "float4x4") || (typeA === "float3x3" && typeB === "float3x3") || (typeA === "float2x2" && typeB === "float2x2")
        if (!validTypePairings) {
            throw Error("Invalid type pairings")
        }

        if (typeA === "float4x4") {
            const matA = new Float32Array([
                a[0][0], a[0][1], a[0][2], a[0][3],
                a[1][0], a[1][1], a[1][2], a[1][3],
                a[2][0], a[2][1], a[2][2], a[2][3],
                a[3][0], a[3][1], a[3][2], a[3][3]
            ]);
            const matB = new Float32Array([
                b[0][0], b[0][1], b[0][2], b[0][3],
                b[1][0], b[1][1], b[1][2], b[1][3],
                b[2][0], b[2][1], b[2][2], b[2][3],
                b[3][0], b[3][1], b[3][2], b[3][3]
            ]);

            const result = glMatrix.mat4.create();
            glMatrix.mat4.multiply(result, matA, matB);

            return {'value': {value: [
                [result[0], result[1], result[2], result[3]],
                [result[4], result[5], result[6], result[7]],
                [result[8], result[9], result[10], result[11]],
                [result[12], result[13], result[14], result[15]]
            ], type: typeIndexA}};
        } else if (typeA === "float3x3") {
            const matA = new Float32Array([
                a[0][0], a[0][1], a[0][2],
                a[1][0], a[1][1], a[1][2],
                a[2][0], a[2][1], a[2][2]
            ]);
            const matB = new Float32Array([
                b[0][0], b[0][1], b[0][2],
                b[1][0], b[1][1], b[1][2],
                b[2][0], b[2][1], b[2][2]
            ]);

            const result = glMatrix.mat3.create();
            glMatrix.mat3.multiply(result, matA, matB);

            return {'value': {value: [
                [result[0], result[1], result[2]],
                [result[3], result[4], result[5]],
                [result[6], result[7], result[8]]
            ], type: typeIndexA}};
        } else if (typeA === "float2x2") {
            const matA = new Float32Array([
                a[0][0], a[0][1],
                a[1][0], a[1][1]
            ]);
            const matB = new Float32Array([
                b[0][0], b[0][1],
                b[1][0], b[1][1]
            ]);

            const result = glMatrix.mat2.create();
            glMatrix.mat2.multiply(result, matA, matB);

            return {'value': {value: [
                [result[0], result[1]],
                [result[2], result[3]]
            ], type: typeIndexA}}
        } else {
            throw Error(`Invalid type ${typeA}`)
        }
    }
}