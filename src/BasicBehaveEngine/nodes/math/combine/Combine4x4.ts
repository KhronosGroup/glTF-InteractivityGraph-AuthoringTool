import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Combine4x4 extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}, {id: "b"}, {id: "c"}, {id: "d"},
        {id:"e"}, {id: "f"}, {id: "g"}, {id: "h"},
        {id:"i"}, {id: "j"}, {id: "k"}, {id: "l"},
        {id:"m"}, {id: "n"}, {id: "o"}, {id: "p"}];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Combine4x4Node";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const characters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];
        for (let i = 0; i < characters.length; i++) {
            const typeIndex = this.values[characters[i]].type!
            const typ: string = this.getType(typeIndex);
            if (typ !== "float") {
                throw Error(`invalid input type for ${characters[i]}`);
            }
        }

        return {'value': {id: "value", value: [[a, b, c, d], [e, f, g, h], [i, j, k, l], [m, n, o, p]], type: this.getTypeIndex("float4x4")}};
    }
}
