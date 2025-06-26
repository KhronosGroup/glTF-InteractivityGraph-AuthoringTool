import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class QuatToAxisAngle extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "QuatToAxisAngleNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);

        if (typeA !== "float4") {
            throw Error(`a should be of type float4, got ${typeA}`)
        }

        if (this.isCloseTo(a[3], 0)) {
            return {'axis': {value: [1, 0, 0], type: this.getTypeIndex("float3")}, 'angle': {value: [0], type: this.getTypeIndex("float")}}
        }
        const axisX = a[0] / Math.sqrt(1 - a[3] * a[3])
        const axisY = a[1] / Math.sqrt(1 - a[3] * a[3])
        const axisZ = a[2] / Math.sqrt(1 - a[3] * a[3])
        const angle = 2 * Math.acos(a[3])

        return {'axis': {value: [axisX, axisY, axisZ], type: this.getTypeIndex("float3")}, 'angle': {value: [angle], type: this.getTypeIndex("float")}}
    }

    isCloseTo(a: number, b: number, epsilon: number = 1e-6): boolean {
        return Math.abs(a - b) < epsilon;
    }

}
