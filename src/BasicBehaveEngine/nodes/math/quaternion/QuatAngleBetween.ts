import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class QuatAngleBetween extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "QuatAngleBetweenNode";
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

        const dotProduct = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
        const angle = 2 * Math.acos(dotProduct)

        return {'value': {value: [angle], type: this.getTypeIndex("float")}}
    }
}
