import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Combine3 extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}, {id: "b"}, {id: "c"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Combine3Node";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b, c} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        const typeIndexC = this.values['c'].type!
        const typeC: string = this.getType(typeIndexC);
        if (typeA !== "float" || typeB !== "float" || typeC !== "float") {
            throw Error("invalid input types")
        }

        return {'value': {id: "value", value: [a, b, c], type: this.getTypeIndex("float3")}};
    }
}
