import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

type Quat = [number, number, number, number];

export class QuatFromAngles extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {order: {defaultValue: ["yxz"]}}
    REQUIRED_VALUES = {x: {}, y: {}, z: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "QuatFromAnglesNode";
        this.validateValues(this.values);
    }

    private multiplyQuaternions(q1: Quat, q2: Quat): Quat {
        const [x1, y1, z1, w1] = q1;
        const [x2, y2, z2, w2] = q2;

        return [
            x1 * w2 + w1 * x2 + y1 * z2 - z1 * y2,
            y1 * w2 + w1 * y2 + z1 * x2 - x1 * z2,
            z1 * w2 + w1 * z2 + x1 * y2 - y1 * x2,
            w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
        ];
    }

    override processNode(flowSocket?: string) {
        const {x, y, z} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);

        const typeIndexAngleX = this.values['x'].type!
        const typeAngleX: string = this.getType(typeIndexAngleX);
        const typeIndexAngleY = this.values['y'].type!
        const typeAngleY: string = this.getType(typeIndexAngleY);
        const typeIndexAngleZ = this.values['z'].type!
        const typeAngleZ: string = this.getType(typeIndexAngleZ);

        if (typeAngleX !== "float" || typeAngleY !== "float" || typeAngleZ !== "float") {
            throw Error(`Angles must be of type float.`);
        }

        // 1. Get the rotation order from configurations (defaulting to "yxz")
        const order: string = (this.configuration?.order?.value?.[0] || "yxz");

        // 2. Generate elemental quaternions for each axis rotation
        const cx = Math.cos(Number(x) / 2);
        const sx = Math.sin(Number(x) / 2);
        const cy = Math.cos(Number(y) / 2);
        const sy = Math.sin(Number(y) / 2);
        const cz = Math.cos(Number(z) / 2);
        const sz = Math.sin(Number(z) / 2);

        const qX: Quat = [sx, 0, 0, cx];
        const qY: Quat = [0, sy, 0, cy];
        const qZ: Quat = [0, 0, sz, cz];

        // Map characters to their respective quaternions
        const quatMap: Record<string, Quat> = { x: qX, y: qY, z: qZ };

        if (!quatMap[order[0]] || !quatMap[order[1]] || !quatMap[order[2]]) {
            throw Error(`Invalid rotation order: ${order}. Must contain x, y, and z.`);
        }

        // 3. Multiply quaternions in the sequence of the specified intrinsic order (e.g., Y * X * Z)
        const qFirst = quatMap[order[0]];
        const qSecond = quatMap[order[1]];
        const qThird = quatMap[order[2]];

        const tempQuat = this.multiplyQuaternions(qFirst, qSecond);
        const finalQuat = this.multiplyQuaternions(tempQuat, qThird);

        return {'value': {value: finalQuat, type: this.getTypeIndex("float4")}}
    }
}