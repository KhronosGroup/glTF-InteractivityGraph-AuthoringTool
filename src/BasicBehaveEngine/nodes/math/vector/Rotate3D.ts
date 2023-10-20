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
                const cos_theta = Math.cos(Number(c));
                // eslint-disable-next-line no-case-declarations
                const sin_theta = Math.sin(Number(c));

                // eslint-disable-next-line no-case-declarations
                const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
                // eslint-disable-next-line no-case-declarations
                const parallelCoeff = (dot * (1 - cos_theta));
                // eslint-disable-next-line no-case-declarations
                const parallel = [
                    b[0] * parallelCoeff,
                    b[1] * parallelCoeff,
                    b[2] * parallelCoeff
                ]
                // eslint-disable-next-line no-case-declarations
                const perpendicular = [
                    (a[0] -  dot*b[0]) * sin_theta,
                    (a[1] -  dot*b[1]) * sin_theta,
                    (a[2] -  dot*b[2]) * sin_theta
                ];
                val = [
                   a[0] * cos_theta + perpendicular[0] + parallel[0],
                    a[1] * cos_theta + perpendicular[1] + parallel[1],
                    a[2] * cos_theta + perpendicular[2] + parallel[2],
                ];
                break;
            default:
                throw Error("Invalid type")
        }

        return {id: "val", value: val, type: typeIndexA}
    }
}
