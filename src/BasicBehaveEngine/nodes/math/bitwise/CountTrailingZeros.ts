import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class CountTrailingZeros extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CountTrailingZerosNode";
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
        let val = a ? (31 - Math.clz32(a & -a)) : 32;
        return {'val': {id: "val", value: val, type: this.getTypeIndex('int')}}
    }
}
