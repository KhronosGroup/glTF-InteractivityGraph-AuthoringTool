import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class MatMul extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MatMul";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);

        if (typeA !== "float4x4") {
            throw Error("input types not equivalent")
        }
        if (typeB !== "float4x4") {
            throw Error("Invalid type")
        }

        const val: number[][] = a.map((rowA: any[], i: string | number) =>
            rowA.map((_, j) =>
                rowA.reduce((sum, _, k) => sum + a[i][k] * b[k][j], 0)
            )
        );

        return {'value': {value: val, type: typeIndexA}}
    }
}
