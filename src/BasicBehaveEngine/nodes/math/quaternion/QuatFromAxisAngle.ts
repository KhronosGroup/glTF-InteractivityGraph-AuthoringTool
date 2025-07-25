import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class QuatFromAxisAngle extends BehaveEngineNode {
    REQUIRED_VALUES = {axis: {}, angle: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "QuatFromAxisAngleNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {axis, angle} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexAxis = this.values['axis'].type!
        const typeAxis: string = this.getType(typeIndexAxis);
        const typeIndexAngle = this.values['angle'].type!
        const typeAngle: string = this.getType(typeIndexAngle);

        if (typeAxis !== "float3") {
            throw Error(`axis should be of type float3, got ${typeAxis}`)
        }
        if (typeAngle !== "float") {
            throw Error(`angle should be of type float, got ${typeAngle}`)
        }

        const x = axis[0] * Math.sin(Number(angle) / 2)
        const y = axis[1] * Math.sin(Number(angle) / 2)
        const z = axis[2] * Math.sin(Number(angle) / 2)
        const w = Math.cos(Number(angle) / 2)

        const val = [x, y, z, w]
        return {'value': {value: val, type: this.getTypeIndex("float4")}}
    }
}
