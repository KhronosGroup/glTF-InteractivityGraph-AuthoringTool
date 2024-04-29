import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Extract4 extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Extract4Node";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        if (typeA !== "float4") {
            throw Error("invalid input type");
        }

        return {
            '0': {id: "0", value: a[0], type: this.getTypeIndex("float")},
            '1': {id: "1", value: a[1], type: this.getTypeIndex("float")},
            '2': {id: "2", value: a[2], type: this.getTypeIndex("float")},
            '3': {id: "3", value: a[3], type: this.getTypeIndex("float")},
        };
    }
}
