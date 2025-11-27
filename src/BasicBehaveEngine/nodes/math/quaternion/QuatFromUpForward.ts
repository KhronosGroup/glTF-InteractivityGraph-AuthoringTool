import * as glMatrix from "gl-matrix";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class QuatFromUpForward extends BehaveEngineNode {
    REQUIRED_VALUES = {up: {}, forward: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "QuatFromUpForwardNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {up, forward} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexUp = this.values['up'].type!
        const typeUp: string = this.getType(typeIndexUp);
        const typeIndexForward = this.values['forward'].type!
        const typeForward: string = this.getType(typeIndexForward);

        if (typeUp !== "float3") {
            throw Error(`up should be of type float3, got ${typeUp}`)
        }
        if (typeForward !== "float3") {
            throw Error(`forward should be of type float3, got ${typeForward}`)
        }

        const fwd = glMatrix.vec3.fromValues(forward[0], forward[1], forward[2]);
    
        const upVec = glMatrix.vec3.fromValues(up[0], up[1], up[2]);

        const right = glMatrix.vec3.create();
        glMatrix.vec3.cross(right, upVec, fwd);
        if (glMatrix.vec3.len(right) < 1e-6) {
            // If up and forward are colinear, choose auxiliary axis least aligned with forward
            const ax = Math.abs(fwd[0]);
            const ay = Math.abs(fwd[1]);
            const az = Math.abs(fwd[2]);
            let arbitrary: glMatrix.vec3;
            if (ax <= ay && ax <= az) {
                arbitrary = glMatrix.vec3.fromValues(1, 0, 0);
            } else if (ay <= ax && ay <= az) {
                arbitrary = glMatrix.vec3.fromValues(0, 1, 0);
            } else {
                arbitrary = glMatrix.vec3.fromValues(0, 0, 1);
            }
            glMatrix.vec3.cross(right, arbitrary, fwd);
        }
        glMatrix.vec3.normalize(right, right);

        const trueUp = glMatrix.vec3.create();
        glMatrix.vec3.cross(trueUp, fwd, right);
     
        const m = glMatrix.mat3.create();
        // Set columns of rotation matrix: right, up, forward
        m[0] = right[0]; m[1] = right[1]; m[2] = right[2];
        m[3] = trueUp[0]; m[4] = trueUp[1]; m[5] = trueUp[2];
        m[6] = fwd[0];    m[7] = fwd[1];    m[8] = fwd[2];

        const outQ = glMatrix.quat.create();
        glMatrix.quat.fromMat3(outQ, m);
        glMatrix.quat.normalize(outQ, outQ);

        const val = [outQ[0], outQ[1], outQ[2], outQ[3]]
        return {'value': {value: val, type: this.getTypeIndex("float4")}}
    }
}
