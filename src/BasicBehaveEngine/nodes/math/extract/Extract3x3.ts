import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Extract3x3 extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Extract3x3Node";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        if (typeA !== "float3x3") {
            throw Error("invalid input type");
        }

        return {
            '0': {value: [a[0][0]], type: this.getTypeIndex("float")},
            '1': {value: [a[0][1]], type: this.getTypeIndex("float")},
            '2': {value: [a[0][2]], type: this.getTypeIndex("float")},
            '3': {value: [a[1][0]], type: this.getTypeIndex("float")},
            '4': {value: [a[1][1]], type: this.getTypeIndex("float")},
            '5': {value: [a[1][2]], type: this.getTypeIndex("float")},
            '6': {value: [a[2][0]], type: this.getTypeIndex("float")},
            '7': {value: [a[2][1]], type: this.getTypeIndex("float")},
            '8': {value: [a[2][2]], type: this.getTypeIndex("float")}
        };
    }
}
