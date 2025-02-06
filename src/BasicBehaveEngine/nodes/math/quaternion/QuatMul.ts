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
        const {a, b} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
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

        const quatA = glMatrix.quat.create();
        glMatrix.quat.set(quatA, a[0], a[1], a[2], a[3]);
        const quatB = glMatrix.quat.create();
        glMatrix.quat.set(quatB, b[0], b[1], b[2], b[3]);

        const result = glMatrix.quat.create();
        glMatrix.quat.mul(result, quatA, quatB);

        const val = [result[0], result[1], result[2], result[3]]
        return {'value': {value: val, type: this.getTypeIndex("float4")}}
    }
}
