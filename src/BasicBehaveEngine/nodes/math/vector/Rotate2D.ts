import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Rotate2D extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, angle: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Rotate2DNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, angle} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexAngle = this.values['angle'].type!
        const typeAngle: string = this.getType(typeIndexAngle);


        if (typeAngle !== "float") {
            throw Error("Invalid type")
        }
        let val: any;

        switch (typeA) {
            case "float2":
                // eslint-disable-next-line no-case-declarations
                const cosTheta = Math.cos(Number(angle));
                // eslint-disable-next-line no-case-declarations
                const sinTheta = Math.sin(Number(angle));

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

        return {'value': {value: val, type: typeIndexA}}
    }
}
