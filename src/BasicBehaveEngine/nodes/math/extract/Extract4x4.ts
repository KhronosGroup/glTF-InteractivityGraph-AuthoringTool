import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Extract4x4 extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Extract4x4Node";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        if (typeA !== "float4x4") {
            throw Error("invalid input type");
        }
        
        return {
            '0': {value: [a[0]], type: this.getTypeIndex("float")},
            '1': {value: [a[1]], type: this.getTypeIndex("float")},
            '2': {value: [a[2]], type: this.getTypeIndex("float")},
            '3': {value: [a[3]], type: this.getTypeIndex("float")},
            '4': {value: [a[4]], type: this.getTypeIndex("float")},
            '5': {value: [a[5]], type: this.getTypeIndex("float")},
            '6': {value: [a[6]], type: this.getTypeIndex("float")},
            '7': {value: [a[7]], type: this.getTypeIndex("float")},
            '8': {value: [a[8]], type: this.getTypeIndex("float")},
            '9': {value: [a[9]], type: this.getTypeIndex("float")},
            '10': {value: [a[10]], type: this.getTypeIndex("float")},
            '11': {value: [a[11]], type: this.getTypeIndex("float")},
            '12': {value: [a[12]], type: this.getTypeIndex("float")},
            '13': {value: [a[13]], type: this.getTypeIndex("float")},
            '14': {value: [a[14]], type: this.getTypeIndex("float")},
            '15': {value: [a[15]], type: this.getTypeIndex("float")},
        };
    }
}
