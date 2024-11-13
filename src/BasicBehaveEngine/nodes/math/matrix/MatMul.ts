import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class MatMul extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}, {id: "b"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MatMul";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
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

        return {'val': {id: "val", value: val, type: typeIndexA}}
    }
}
