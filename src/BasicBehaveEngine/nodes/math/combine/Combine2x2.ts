import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Combine2x2 extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}, c: {}, d: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Combine2x2Node";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b, c, d} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const characters = ['a', 'b', 'c', 'd'];
        for (let i = 0; i < characters.length; i++) {
            const typeIndex = this.values[characters[i]].type!
            const typ: string = this.getType(typeIndex);
            if (typ !== "float") {
                throw Error(`invalid input type for ${characters[i]}`);
            }
        }

        return {'value': {value: [[a, b], [c, d]], type: this.getTypeIndex("float2x2")}};
    }
}
