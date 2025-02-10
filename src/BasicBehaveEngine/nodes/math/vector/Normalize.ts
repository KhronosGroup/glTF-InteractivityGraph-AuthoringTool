import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Normalize extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "NormalizeNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "float2":
                // eslint-disable-next-line no-case-declarations
                const length2 = Math.hypot(a[0], a[1]);
                val = [
                    a[0]/length2,
                    a[1]/length2
                ];
                break;
            case "float3":
                // eslint-disable-next-line no-case-declarations
                const length3 = Math.hypot(a[0], a[1], a[2]);
                val = [
                    a[0]/length3,
                    a[1]/length3,
                    a[2]/length3,
                ];
                break;
            case "float4":
                // eslint-disable-next-line no-case-declarations
                const length4 = Math.hypot(a[0], a[1], a[2], a[3]);
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

        return {'value': {value: val, type: typeIndex}}
    }
}
