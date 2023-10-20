import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Clamp extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}, {id: "b"}, {id: "c"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ClampNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b, c} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        const typeIndexC = this.values['c'].type!
        const typeC: string = this.getType(typeIndexC);
        if (typeA !== typeB || typeB !== typeC) {
            throw Error("input types not equivalent")
        }
        let val: any;

        switch (typeA) {
            case "float":
                val = Math.min(Math.max(a,b),c);
                break;
            case "float3":
                val = [
                    Math.min(Math.max(a[0], b[0]), c[0]),
                    Math.min(Math.max(a[1], b[1]), c[1]),
                    Math.min(Math.max(a[2], b[2]), c[2])
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        return {id: "val", value: val, type: typeIndexA}
    }
}
