import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Transpose extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "TransposeNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);

        if (typeA !== "float4x4" && typeA !== "float3x3" && typeA !== "float2x2") {
            throw Error("Invalid type")
        }
        let dimension = Number(typeA.charAt(typeA.length - 1))
        let val: number[][] = [];

        for (let col = 0; col < dimension; col++) {
            val.push([])
            for (let row = 0; row < dimension; row++) {
                val[col].push(a[row][col])
            }
        }

        return {'value': {value: val, type: typeIndexA}}
    }
}
