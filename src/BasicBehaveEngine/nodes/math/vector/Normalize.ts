import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Normalize extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "NormalizeNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "float2":
                // eslint-disable-next-line no-case-declarations
                const length2 = Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2));
                val = [
                    a[0]/length2,
                    a[1]/length2
                ];
                break;
            case "float3":
                // eslint-disable-next-line no-case-declarations
                const length3 = Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2));
                val = [
                    a[0]/length3,
                    a[1]/length3,
                    a[2]/length3,
                ];
                break;
            case "float4":
                // eslint-disable-next-line no-case-declarations
                const length4 = Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2));
                val = [
                    a[0]/length4,
                    a[1]/length4,
                    a[2]/length4,
                    a[3]/length4,
                ];
                break;
            default:
                throw Error("Invalid type")
        }

        return {'value': {id: "value", value: val, type: typeIndex}}
    }
}
