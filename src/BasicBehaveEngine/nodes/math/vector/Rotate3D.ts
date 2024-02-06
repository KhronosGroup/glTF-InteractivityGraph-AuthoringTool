import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Rotate3D extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}, {id: "b"}, {id: "c"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Rotate3DNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b, c} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        const typeIndexC = this.values['c'].type!;
        const typeC: string = this.getType(typeIndexC);

        if (typeA !== typeB) {
            throw Error("input types not equivalent")
        }
        if (typeC !== "float") {
            throw Error("Invalid type")
        }
        let val: any;

        switch (typeA) {
            case "float3":
                // eslint-disable-next-line no-case-declarations
                const cosTheta = Math.cos(Number(c));
                // eslint-disable-next-line no-case-declarations
                const sinTheta = Math.sin(Number(c));

                // eslint-disable-next-line no-case-declarations
                const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
                // eslint-disable-next-line no-case-declarations
                const parallelCoeff = (dot * (1 - cosTheta));
                // eslint-disable-next-line no-case-declarations
                const parallel = [
                    b[0] * parallelCoeff,
                    b[1] * parallelCoeff,
                    b[2] * parallelCoeff
                ]
                // eslint-disable-next-line no-case-declarations
                const perpendicular = [
                    (a[0] -  dot*b[0]) * sinTheta,
                    (a[1] -  dot*b[1]) * sinTheta,
                    (a[2] -  dot*b[2]) * sinTheta
                ];
                val = [
                   a[0] * cosTheta + perpendicular[0] + parallel[0],
                    a[1] * cosTheta + perpendicular[1] + parallel[1],
                    a[2] * cosTheta + perpendicular[2] + parallel[2],
                ];
                break;
            default:
                throw Error("Invalid type")
        }

        return {'val': {id: "val", value: val, type: typeIndexA}}
    }
}
