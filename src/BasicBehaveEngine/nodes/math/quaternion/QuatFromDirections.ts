import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class QuatFromDirections extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "QuatFromDirectionsNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);

        if (typeA !== "float3") {
            throw Error(`a should be of type float3, got ${typeA}`)
        }
        if (typeB !== "float3") {
            throw Error(`b should be of type float3, got ${typeB}`)
        }

        const c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

        if (this.isCloseTo(c, 1)) {
            return {'value': {value: [0, 0, 0, 1], type: this.getTypeIndex("float4")}}
        }
         
        if (this.isCloseTo(c, -1)) {
            // Find a perpendicular vector to a by using cross product with [1,0,0] or [0,1,0]
            let perpendicular;
            if (Math.abs(a[0]) < Math.abs(a[1])) {
                // Cross product with [1,0,0]
                perpendicular = [0, -a[2], a[1]];
            } else {
                // Cross product with [0,1,0] 
                perpendicular = [-a[2], 0, a[0]];
            }
            
            // Normalize the perpendicular vector
            const length = Math.sqrt(perpendicular[0] * perpendicular[0] + perpendicular[1] * perpendicular[1] + perpendicular[2] * perpendicular[2]);
            const x = perpendicular[0] / length;
            const y = perpendicular[1] / length;
            const z = perpendicular[2] / length;
            const w = 0;

            return {'value': {value: [x, y, z, w], type: this.getTypeIndex("float4")}}
        }

        const aCrossB = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
        const aCrossBLength = Math.sqrt(aCrossB[0] * aCrossB[0] + aCrossB[1] * aCrossB[1] + aCrossB[2] * aCrossB[2])
        const aCrossBNormalized = [aCrossB[0] / aCrossBLength, aCrossB[1] / aCrossBLength, aCrossB[2] / aCrossBLength]

        const x = aCrossBNormalized[0] * Math.sqrt(0.5 - 0.5 * c)
        const y = aCrossBNormalized[1] * Math.sqrt(0.5 - 0.5 * c)
        const z = aCrossBNormalized[2] * Math.sqrt(0.5 - 0.5 * c)
        const w = Math.sqrt(0.5 + 0.5 * c)

        return {'value': {value: [x, y, z, w], type: this.getTypeIndex("float4")}}
    }

    isCloseTo(a: number, b: number, epsilon = 1e-6): boolean {
        return Math.abs(a - b) < epsilon;
    }
}
