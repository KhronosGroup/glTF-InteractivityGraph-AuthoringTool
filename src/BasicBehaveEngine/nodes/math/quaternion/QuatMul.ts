import * as glMatrix from "gl-matrix";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class QuatMul extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "QuatMulNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateRequiredValues();
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);

        if (typeA !== "float4") {
            throw Error(`a should be of type float4, got ${typeA}`)
        }
        if (typeB !== "float4") {
            throw Error(`b should be of type float4, got ${typeB}`)
        }

        // plain number arrays: gl-matrix defaults to Float32Array, but spec floats are doubles
        const quatA = Array(4).fill(0) as glMatrix.quat;
        glMatrix.quat.set(quatA, a[0], a[1], a[2], a[3]);
        const quatB = Array(4).fill(0) as glMatrix.quat;
        glMatrix.quat.set(quatB, b[0], b[1], b[2], b[3]);

        const result = Array(4).fill(0) as glMatrix.quat;
        glMatrix.quat.mul(result, quatA, quatB);

        const val = [result[0], result[1], result[2], result[3]]
        return {'value': {value: val, type: this.getTypeIndex("float4")}}
    }
}
