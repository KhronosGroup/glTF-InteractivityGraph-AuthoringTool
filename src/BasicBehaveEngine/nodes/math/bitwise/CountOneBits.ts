import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class CountOneBits extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CountOneBitsNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        if (typeA !== "int") {
            throw Error("invalid input type")
        }
        let count = 0;
        let tempNumber = a;
        while (tempNumber !== 0 ) {
            tempNumber = tempNumber & (tempNumber - 1);
            count++;
        }

        return {'val': {id: "val", value: count, type: this.getTypeIndex('int')}}
    }
}
