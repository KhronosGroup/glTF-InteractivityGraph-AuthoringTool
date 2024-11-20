import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Rotate2D extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}, {id: "b"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Rotate2DNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);


        if (typeB !== "float") {
            throw Error("Invalid type")
        }
        let val: any;

        switch (typeA) {
            case "float2":
                // eslint-disable-next-line no-case-declarations
                const cosTheta = Math.cos(Number(b));
                // eslint-disable-next-line no-case-declarations
                const sinTheta = Math.sin(Number(b));

                // eslint-disable-next-line no-case-declarations
                const rotationMatrix = [
                    [cosTheta, -sinTheta],
                    [sinTheta, cosTheta]
                ]

                val = [
                    a[0] * rotationMatrix[0][0] + a[1] * rotationMatrix[0][1],
                    a[0] * rotationMatrix[1][0] + a[1] * rotationMatrix[1][1]
                ];
                break;
            default:
                throw Error("Invalid type")
        }

        return {'value': {id: "value", value: val, type: typeIndexA}}
    }
}
