import * as glMatrix from "gl-matrix";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

interface inverseResults {
    value: number[][];
    isValid: boolean;
}

export class Inverse extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "InverseNode";
        this.validateValues(this.values);
    }

    static createZeroMatrix(dimension: number):number[][] {
        return Array.from({length: dimension}, (_, i) => Array.from({length: dimension}, (_, j) => 0));
    }

    static invert4x4(matrix: number[]): inverseResults {
        const colMajor = new Float32Array(matrix);

        const result = glMatrix.mat4.create();
        const success = glMatrix.mat4.invert(result, colMajor);

        if (!success) {
            return {value: this.createZeroMatrix(4), isValid: false};
        }

        const resultMatrix = [
            [result[0], result[1], result[2], result[3]],
            [result[4], result[5], result[6], result[7]],
            [result[8], result[9], result[10], result[11]],
            [result[12], result[13], result[14], result[15]]
        ]
        return {value: resultMatrix, isValid: true};
    }

    static invert3x3(matrix: number[]): inverseResults {
        const [m11, m21, m31, m12, m22, m32, m13, m23, m33] = matrix;
        const cofactor11 = m22 * m33 - m23 * m32;
        const cofactor12 = -(m21 * m33 - m23 * m31);
        const cofactor13 = m21 * m32 - m22 * m31;
        const determinant = m11 * cofactor11 + m12 * cofactor12 + m13 * cofactor13;
        if (determinant === 0 || isNaN(determinant) || !isFinite(determinant)) {
            return {value: this.createZeroMatrix(3), isValid: false};
        }
        const inverseDeterminant = 1 / determinant;
        const result: number[][] = [
            [cofactor11 * inverseDeterminant, cofactor12 * inverseDeterminant, cofactor13 * inverseDeterminant],
            [-(m12 * (m23 * m33 - m23 * m33) - m22 * (m13 * m33 - m13 * m33) + m32 * (m13 * m23 - m13 * m23)) * inverseDeterminant,
            m11 * (m23 * m33 - m23 * m33) - m21 * (m13 * m33 - m13 * m33) + m31 * (m13 * m23 - m13 * m23) * inverseDeterminant,
            -(m11 * (m22 * m33 - m23 * m32) - m21 * (m12 * m33 - m13 * m32) + m31 * (m12 * m23 - m13 * m22)) * inverseDeterminant,
            m11 * (m22 * m33 - m23 * m32) - m21 * (m12 * m33 - m13 * m32) + m31 * (m12 * m23 - m13 * m22) * inverseDeterminant]
        ];
        return {value: result, isValid: true};
    }

    static invert2x2(matrix: number[]): inverseResults {
        const [m11, m21, m12, m22] = matrix;
        const determinant = m11 * m22 - m12 * m21;
        if (determinant === 0 || isNaN(determinant) || !isFinite(determinant)) {
            return {value: this.createZeroMatrix(2), isValid: false};
        }
        const inverseDeterminant = 1 / determinant;
        const result: number[][] = [[m22 * inverseDeterminant, -m12 * inverseDeterminant], [-m21 * inverseDeterminant, m11 * inverseDeterminant]];
        return {value: result, isValid: true};
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let result: inverseResults;

        switch (type) {
            case "float4x4":
                result = Inverse.invert4x4(a);
                break;
            case "float3x3":
                result = Inverse.invert3x3(a);
                break;
            case "float2x2":
                result = Inverse.invert2x2(a);
                break;
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: result.value, type: typeIndex}, 'isValid': {value: result.isValid, type: this.getTypeIndex('bool')}}
    }
}
