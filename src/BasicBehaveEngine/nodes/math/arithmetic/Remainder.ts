import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Remainder extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "RemainderNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        if (typeA !== typeB) {
            throw Error("input types not equivalent")
        }
        let val: any;

        switch (typeA) {
            case "int":
                val = [(a % b) | 0];
                break;
            case "float":
                val = [a % b];
                break;
            case "float2":
                val = [
                    a[0] % b[0],
                    a[1] % b[1]
                ]
                break;
            case "float3":
                val = [
                    a[0] % b[0],
                    a[1] % b[1],
                    a[2] % b[2],
                ]
                break;
            case "float4":
                val = [
                    a[0] % b[0],
                    a[1] % b[1],
                    a[2] % b[2],
                    a[3] % b[3],
                ]
                break
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndexA}}
    }
}
