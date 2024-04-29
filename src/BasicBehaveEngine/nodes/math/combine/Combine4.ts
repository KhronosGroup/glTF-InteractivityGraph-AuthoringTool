import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Combine4 extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}, {id: "b"}, {id: "c"}, {id: "d"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Combine4Node";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b, c, d} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        const typeIndexC = this.values['c'].type!
        const typeC: string = this.getType(typeIndexC);
        const typeIndexD = this.values['d'].type!
        const typeD: string = this.getType(typeIndexD);
        if (typeA !== "float" || typeB !== "float" || typeC !== "float" || typeD !== "float") {
            throw Error("invalid input types")
        }

        return {'val': {id: "val", value: [a, b, c, d], type: this.getTypeIndex("float4")}};
    }
}
