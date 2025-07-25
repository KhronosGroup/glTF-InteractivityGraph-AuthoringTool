import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Combine3x3 extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}, c: {}, d: {}, e: {}, f: {}, g: {}, h: {}, i: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Combine3x3Node";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b, c, d, e, f, g, h, i} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const characters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
        for (let i = 0; i < characters.length; i++) {
            const typeIndex = this.values[characters[i]].type!
            const typ: string = this.getType(typeIndex);
            if (typ !== "float") {
                throw Error(`invalid input type for ${characters[i]}`);
            }
        }

        return {'value': {value: [[a, d, g], [b, e, h], [c, f, i]], type: this.getTypeIndex("float3x3")}};
    }
}
