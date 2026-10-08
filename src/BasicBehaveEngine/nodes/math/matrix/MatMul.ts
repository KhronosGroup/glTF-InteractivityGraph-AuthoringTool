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
        const {a, b} = this.evaluateRequiredValues();
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
            // plain number arrays: gl-matrix defaults to Float32Array, but spec floats are doubles
            const matA: glMatrix.mat4 = [
                a[0], a[1], a[2], a[3],
                a[4], a[5], a[6], a[7],
                a[8], a[9], a[10], a[11],
                a[12], a[13], a[14], a[15]
            ];
            const matB: glMatrix.mat4 = [
                b[0], b[1], b[2], b[3],
                b[4], b[5], b[6], b[7],
                b[8], b[9], b[10], b[11],
                b[12], b[13], b[14], b[15]
            ];

            const result = Array(16).fill(0) as glMatrix.mat4;
            glMatrix.mat4.multiply(result, matA, matB);

            return {'value': {value: [
                result[0], result[1], result[2], result[3],
                result[4], result[5], result[6], result[7],
                result[8], result[9], result[10], result[11],
                result[12], result[13], result[14], result[15]
            ], type: typeIndexA}};
        } else if (typeA === "float3x3") {
            const matA: glMatrix.mat3 = [
                a[0], a[1], a[2],
                a[3], a[4], a[5],
                a[6], a[7], a[8]
            ];
            const matB: glMatrix.mat3 = [
                b[0], b[1], b[2],
                b[3], b[4], b[5],
                b[6], b[7], b[8]
            ];

            const result = Array(9).fill(0) as glMatrix.mat3;
            glMatrix.mat3.multiply(result, matA, matB);

            return {'value': {value: [
                result[0], result[1], result[2],
                result[3], result[4], result[5],
                result[6], result[7], result[8]
            ], type: typeIndexA}};
        } else if (typeA === "float2x2") {
            const matA: glMatrix.mat2 = [
                a[0], a[1],
                a[2], a[3]
            ];
            const matB: glMatrix.mat2 = [
                b[0], b[1],
                b[2], b[3]
            ];

            const result = Array(4).fill(0) as glMatrix.mat2;
            glMatrix.mat2.multiply(result, matA, matB);

            return {'value': {value: [
                result[0], result[1],
                result[2], result[3]
            ], type: typeIndexA}}
        } else {
            throw Error(`Invalid type ${typeA}`)
        }
    }
}