import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Transform extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "TransformNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);

        // MATRIX TO FIX
        const validTypePairings = (typeA === "float4" && typeB === "float4x4") || (typeA === "float3" && typeB === "float3x3") || (typeA === "float2" && typeB === "float2x2")
        if (!validTypePairings) {
            throw Error("Invalid type pairings")
        }
        const dimension = Number(typeA.charAt(typeA.length - 1))
        const val: number[] = [];

        for (let row = 0; row < dimension; row++) {
            let sum = 0;
            for (let col = 0; col < dimension; col++) {
                sum += b[col * dimension + row] * a[col];
            }
            val.push(sum);
        }

        return {'value': {value: val, type: typeIndexA}}
    }
}
