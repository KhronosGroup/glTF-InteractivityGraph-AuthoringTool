import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Not extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "NotNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        let val: any;
        switch (typeA) {
            case "bool":
                val = !JSON.parse(a);
                break;
            case "int":
                val = ~a;
                break;
            default:
                throw Error("Invalid type")
        }
        return {'value': {value: [val], type: typeIndexA}}
    }
}
