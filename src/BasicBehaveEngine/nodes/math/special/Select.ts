import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Select extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}, condition: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "SelectNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b, condition} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        if (typeA !== typeB) {
            throw Error("input types not equivalent")
        }
        const typeIndexCondition = this.values['condition'].type!
        const typeCondition: string = this.getType(typeIndexCondition);
        if (typeCondition !== "bool") {
            throw Error("condition has invalid type")
        }
        let val: any = JSON.parse(condition) ? a : b;
        if (typeA === "int" || typeA === "bool" || typeA === "float") {
            val = [val]
        }

        return {'value': {value: val, type: typeIndexA}};
    }
}
