import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";
import * as glMatrix from "gl-matrix";

export class MatCompose extends BehaveEngineNode {
    REQUIRED_VALUES = {translation: {}, rotation: {}, scale: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MatCompose";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {translation, rotation, scale} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexTranslation = this.values['translation'].type!
        const typeTranslation: string = this.getType(typeIndexTranslation);
        const typeIndexRotation = this.values['rotation'].type!
        const typeRotation: string = this.getType(typeIndexRotation);
        const typeIndexScale = this.values['scale'].type!
        const typeScale: string = this.getType(typeIndexScale);


        const validTypePairings = (typeTranslation === "float3" && typeRotation === "float4" && typeScale === "float3")
        if (!validTypePairings) {
            throw Error("Invalid type pairings")
        }

        // Create matrices for translation, rotation and scale
        const rotationMatrix = new Float32Array(16);
        const scaleMatrix = new Float32Array(16);
        const resultMatrix = new Float32Array(16);

        // Set up individual transformation matrices
        glMatrix.mat4.fromQuat(rotationMatrix, rotation); // rotation is in xyzw
        glMatrix.mat4.fromScaling(scaleMatrix, scale);

        // Multiply matrices in TRS order (Translation * Rotation * Scale)
        glMatrix.mat4.multiply(resultMatrix, rotationMatrix, scaleMatrix);
        resultMatrix[12] = translation[0];
        resultMatrix[13] = translation[1];
        resultMatrix[14] = translation[2];
        const val = [
            resultMatrix[0], resultMatrix[1], resultMatrix[2], resultMatrix[3],
            resultMatrix[4], resultMatrix[5], resultMatrix[6], resultMatrix[7],
            resultMatrix[8], resultMatrix[9], resultMatrix[10], resultMatrix[11],
            resultMatrix[12], resultMatrix[13], resultMatrix[14], resultMatrix[15]
        ]

        return {'value': {value: val, type: this.getTypeIndex("float4x4")}}
    }
}
