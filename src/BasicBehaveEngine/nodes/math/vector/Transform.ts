import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Transform extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}, {id: "b"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "TransformNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);

        if (typeA !== "float4") {
            throw Error("input types not equivalent")
        }
        if (typeB !== "float4x4") {
            throw Error("Invalid type")
        }
        let val: number[] = [];

        for (let col = 0; col < 4; col++) {
            let sum = 0;
            for (let row = 0; row < 4; row++) {
                sum += b[row][col] * a[row];
            }
            val.push(sum);
        }

        return {'val': {id: "val", value: val, type: typeIndexA}}
    }
}
