import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Extract4x4 extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Extract4x4Node";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        if (typeA !== "float4x4") {
            throw Error("invalid input type");
        }

        return {
            '0': {id: "0", value: [a[0][0]], type: this.getTypeIndex("float")},
            '1': {id: "1", value: [a[0][1]], type: this.getTypeIndex("float")},
            '2': {id: "2", value: [a[0][2]], type: this.getTypeIndex("float")},
            '3': {id: "3", value: [a[0][3]], type: this.getTypeIndex("float")},
            '4': {id: "4", value: [a[1][0]], type: this.getTypeIndex("float")},
            '5': {id: "5", value: [a[1][1]], type: this.getTypeIndex("float")},
            '6': {id: "6", value: [a[1][2]], type: this.getTypeIndex("float")},
            '7': {id: "7", value: [a[1][3]], type: this.getTypeIndex("float")},
            '8': {id: "8", value: [a[2][0]], type: this.getTypeIndex("float")},
            '9': {id: "9", value: [a[2][1]], type: this.getTypeIndex("float")},
            '10': {id: "10", value: [a[2][2]], type: this.getTypeIndex("float")},
            '11': {id: "11", value: [a[2][3]], type: this.getTypeIndex("float")},
            '12': {id: "12", value: [a[3][0]], type: this.getTypeIndex("float")},
            '13': {id: "13", value: [a[3][1]], type: this.getTypeIndex("float")},
            '14': {id: "14", value: [a[3][2]], type: this.getTypeIndex("float")},
            '15': {id: "15", value: [a[3][3]], type: this.getTypeIndex("float")},
        };
    }
}
