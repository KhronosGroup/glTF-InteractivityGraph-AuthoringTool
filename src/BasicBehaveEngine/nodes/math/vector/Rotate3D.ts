import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Rotate3D extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, rotation: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Rotate3DNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, rotation} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexRotation = this.values['rotation'].type!
        const typeRotation: string = this.getType(typeIndexRotation);

        if (typeA !== "float3") {
            throw Error("a input should be a float3")
        }
        if (typeRotation !== "float4") {
            throw Error("rotation input should be a float4")
        }

        const r = [
            rotation[0],
            rotation[1],
            rotation[2]
        ]
        const rCrossA = this.cross(r, a)
        const rCrossRCrossA = this.cross(r, rCrossA);
        const val = [
            a[0] + 2 * (rCrossRCrossA[0] + rotation[3] * rCrossA[0]),
            a[1] + 2 * (rCrossRCrossA[1] + rotation[3] * rCrossA[1]),
            a[2] + 2 * (rCrossRCrossA[2] + rotation[3] * rCrossA[2])
        ]

        return {'value': {value: val, type: typeIndexA}}
    }

    cross(a: number[], b: number[]): number[] {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
      }
}
