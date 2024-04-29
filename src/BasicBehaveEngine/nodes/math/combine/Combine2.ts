import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Combine2 extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}, {id: "b"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Combine2Node";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        if (typeA !== "float" || typeB !== "float") {
            throw Error("invalid input types")
        }

        return {'val': {id: "val", value: [a, b], type: this.getTypeIndex("float2")}};
    }
}
