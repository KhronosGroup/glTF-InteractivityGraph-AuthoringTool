import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";
import * as glMatrix from "gl-matrix";

export class MatDecompose extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MatDecompose";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);

        const validTypePairings = (typeA === "float4x4")
        if (!validTypePairings) {
            throw Error("Invalid type for a")
        }

        const result = {
            'translation': {value: [0, 0, 0], type: this.getTypeIndex("float3")},
            'rotation': {value: [0, 0, 0, 1], type: this.getTypeIndex("float4")},
            'scale': {value: [1, 1, 1], type: this.getTypeIndex("float3")},
            'isValid': {value: true, type: this.getTypeIndex("bool")}
        }

        // check last row of matrix for valid transform matrix structure
        if (a[0][3] !== 0 || a[1][3] !== 0 || a[2][3] !== 0 || a[3][3] !== 1) {
            console.log("Invalid matrix structure")
            result.isValid.value = false;
            return result;
        }

        const s_x = Math.sqrt(a[0][0] * a[0][0] + a[0][1] * a[0][1] + a[0][2] * a[0][2]);
        const s_y = Math.sqrt(a[1][0] * a[1][0] + a[1][1] * a[1][1] + a[1][2] * a[1][2]);
        const s_z = Math.sqrt(a[2][0] * a[2][0] + a[2][1] * a[2][1] + a[2][2] * a[2][2]);
        // check scale values are non NaN and non infinite
        if (isNaN(s_x) || isNaN(s_y) || isNaN(s_z) || !isFinite(s_x) || !isFinite(s_y) || !isFinite(s_z)) {
            console.log("Invalid scale values")
            result.isValid.value = false;
            return result;
        }

        const B = [
            [a[0][0]/ s_x, a[0][1]/ s_x, a[0][2]/ s_x],
            [a[1][0]/ s_y, a[1][1]/ s_y, a[1][2]/ s_y],
            [a[2][0]/ s_z, a[2][1]/ s_z, a[2][2]/ s_z]
        ]

        // get B determinant and check that it is around 1
        const detB = B[0][0] * (B[1][1] * B[2][2] - B[1][2] * B[2][1]) - B[0][1] * (B[1][0] * B[2][2] - B[1][2] * B[2][0]) + B[0][2] * (B[1][0] * B[2][1] - B[1][1] * B[2][0]);
        if (Math.abs( 1 - Math.abs(detB)) > 1e-6) {
            console.log("Invalid determinant")
            result.isValid.value = false;
            return result;
        }

        result.translation.value = [a[3][0], a[3][1], a[3][2]];

        // detemine scale signs based on detB sign
        if (detB > 0) {
            result.scale.value = [s_x, s_y, s_z];
        } else {
            result.scale.value = [-s_x, -s_y, -s_z];
            B[0][0] = -B[0][0];
            B[0][1] = -B[0][1]; 
            B[0][2] = -B[0][2];
            B[1][0] = -B[1][0];
            B[1][1] = -B[1][1];
            B[1][2] = -B[1][2];
            B[2][0] = -B[2][0];
            B[2][1] = -B[2][1];
            B[2][2] = -B[2][2];
        }

        // get rotation from B matrix and turn it into a quaternion
        const B_matrix = glMatrix.mat3.fromValues(B[0][0], B[0][1], B[0][2], B[1][0], B[1][1], B[1][2], B[2][0], B[2][1], B[2][2]);
        const rotation = glMatrix.quat.create();
        glMatrix.quat.fromMat3(rotation, B_matrix);
        result.rotation.value = [rotation[0], rotation[1], rotation[2], rotation[3]];

        return result;
    }
}
