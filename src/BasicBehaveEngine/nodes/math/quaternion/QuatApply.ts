import * as glMatrix from "gl-matrix";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class QuatApply extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "QuatApplyNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);

        if (typeA !== "float3") {
            throw Error(`a should be of type float3, got ${typeA}`)
        }
        if (typeB !== "float4") {
            throw Error(`b should be of type float4, got ${typeB}`)
        }

        const pureQuat = glMatrix.quat.create();
        glMatrix.quat.set(pureQuat, a[0], a[1], a[2], 0);
        const rotationQuat = glMatrix.quat.create();
        glMatrix.quat.set(rotationQuat, b[0], b[1], b[2], b[3]);
        const conjugatedRotationQuat = glMatrix.quat.create();
        glMatrix.quat.conjugate(conjugatedRotationQuat, rotationQuat);
        
        const result = glMatrix.quat.create();
        glMatrix.quat.mul(result, rotationQuat, pureQuat);
        glMatrix.quat.mul(result, result, conjugatedRotationQuat);

        const val = [result[0], result[1], result[2]]
        console.log(`QuatApplyNode: result: ${result[0]}, ${result[1]}, ${result[2]}`)
        return {'value': {value: val, type: this.getTypeIndex("float3")}}
    }
}
