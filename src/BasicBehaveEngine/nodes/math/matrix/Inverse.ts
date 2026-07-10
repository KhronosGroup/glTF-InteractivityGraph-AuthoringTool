import * as glMatrix from "gl-matrix";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

interface inverseResults {
    value: number[];
    isValid: boolean;
}

export class Inverse extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "InverseNode";
        this.validateValues(this.values);
    }

    static createZeroMatrix(size: number):number[] {
        return Array(size * size).fill(0);
    }

    static invert4x4(matrix: number[]): inverseResults {
        const colMajor = new Float32Array(matrix);
        const determinant = glMatrix.mat4.determinant(colMajor);
        if (!Number.isFinite(determinant) || determinant === 0) {
            return {value: this.createZeroMatrix(4), isValid: false};
        }

        const result = glMatrix.mat4.create();
        const success = glMatrix.mat4.invert(result, colMajor);

        if (!success) {
            return {value: this.createZeroMatrix(4), isValid: false};
        }

        return {value: Array.from(result), isValid: true};
    }

    static invert3x3(matrix: number[]): inverseResults {
        const colMajor = new Float32Array(matrix);
        const determinant = glMatrix.mat3.determinant(colMajor);
        if (!Number.isFinite(determinant) || determinant === 0) {
            return {value: this.createZeroMatrix(3), isValid: false};
        }

        const result = glMatrix.mat3.create();
        const success = glMatrix.mat3.invert(result, colMajor);
        if (!success) {
            return {value: this.createZeroMatrix(3), isValid: false};
        }

        return {value: Array.from(result), isValid: true};
    }

    static invert2x2(matrix: number[]): inverseResults {
        const colMajor = new Float32Array(matrix);
        const determinant = glMatrix.mat2.determinant(colMajor);
        if (!Number.isFinite(determinant) || determinant === 0) {
            return {value: this.createZeroMatrix(2), isValid: false};
        }

        const result = glMatrix.mat2.create();
        const success = glMatrix.mat2.invert(result, colMajor);
        if (!success) {
            return {value: this.createZeroMatrix(2), isValid: false};
        }

        return {value: Array.from(result), isValid: true};
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
