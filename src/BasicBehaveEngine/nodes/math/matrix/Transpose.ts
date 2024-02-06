import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Transpose extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "TransposeNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);

        if (typeA !== "float4x4") {
            throw Error("Invalid type")
        }
        let val: number[][] = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ];

        for (let col = 0; col < 4; col++) {
            for (let row = 0; row < 4; row++) {
                val[col][row] =  a[row][col];
            }
        }

        return {'val': {id: "val", value: val, type: typeIndexA}}
    }
}
