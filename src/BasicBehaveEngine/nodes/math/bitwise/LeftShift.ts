import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class LeftShift extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "LeftShiftNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        if (typeA !== "int" || typeB !== "int") {
            throw Error("invalid input type")
        }
        const val = a << b;
        return {'value': {value: [val], type: this.getTypeIndex('int')}};
    }
}
