import * as glMatrix from "gl-matrix";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

const THRESHOLD = 1e-6;

export class Slerp extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}, b: {}, c: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "SlerpNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b, c} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndexA = this.values['a'].type!;
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!;
        const typeB: string = this.getType(typeIndexB);
        const typeIndexC = this.values['c'].type!;
        const typeC: string = this.getType(typeIndexC);

        if (typeA !== typeB) {
            throw Error("input types not equivalent");
        }
        if (typeC !== "float") {
            throw Error("c must be of type float");
        }

        const t = Number(c);
        let val: any;

        switch (typeA) {
            case "float2": {
                const lenA = Math.hypot(a[0], a[1]);
                const lenB = Math.hypot(b[0], b[1]);
                if (lenA <= THRESHOLD || lenB <= THRESHOLD) {
                    val = [(1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1]];
                    break;
                }
                const ax = a[0] / lenA, ay = a[1] / lenA;
                const bx = b[0] / lenB, by = b[1] / lenB;
                let theta = Math.acos(Math.min(Math.max(ax * bx + ay * by, -1), 1));
                if (ax * by - ay * bx < 0) { theta = -theta; }
                const L = (1 - t) * lenA + t * lenB;
                val = [
                    (ax * Math.cos(t * theta) - ay * Math.sin(t * theta)) * L,
                    (ax * Math.sin(t * theta) + ay * Math.cos(t * theta)) * L
                ];
                break;
            }
            case "float3": {
                const lenA = Math.hypot(a[0], a[1], a[2]);
                const lenB = Math.hypot(b[0], b[1], b[2]);
                if (lenA <= THRESHOLD || lenB <= THRESHOLD) {
                    val = [(1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1], (1 - t) * a[2] + t * b[2]];
                    break;
                }
                const ax = a[0] / lenA, ay = a[1] / lenA, az = a[2] / lenA;
                const bx = b[0] / lenB, by = b[1] / lenB, bz = b[2] / lenB;
                const d = Math.min(Math.max(ax * bx + ay * by + az * bz, -1), 1);
                const L = (1 - t) * lenA + t * lenB;
                if (1 - d <= THRESHOLD) {
                    // nearly parallel — linear blend
                    val = [(1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1], (1 - t) * a[2] + t * b[2]];
                    break;
                }
                // Build rotation quaternion from axis-angle
                let rx: number, ry: number, rz: number;
                if (1 + d <= THRESHOLD) {
                    // antiparallel — pick any perpendicular axis
                    if (Math.abs(ax) <= Math.abs(ay) && Math.abs(ax) <= Math.abs(az)) {
                        const len = Math.hypot(0, -az, ay);
                        rx = 0; ry = -az / len; rz = ay / len;
                    } else if (Math.abs(ay) <= Math.abs(az)) {
                        const len = Math.hypot(-az, 0, ax);
                        rx = -az / len; ry = 0; rz = ax / len;
                    } else {
                        const len = Math.hypot(-ay, ax, 0);
                        rx = -ay / len; ry = ax / len; rz = 0;
                    }
                } else {
                    // normalized cross product of â and b̂
                    const cx = ay * bz - az * by;
                    const cy = az * bx - ax * bz;
                    const cz = ax * by - ay * bx;
                    const cLen = Math.hypot(cx, cy, cz);
                    rx = cx / cLen; ry = cy / cLen; rz = cz / cLen;
                }
                const angle = t * Math.acos(d);
                const s = Math.sin(angle / 2);
                const qx = rx * s, qy = ry * s, qz = rz * s, qw = Math.cos(angle / 2);
                // Rotate â by quaternion q
                const q = glMatrix.quat.fromValues(qx, qy, qz, qw);
                const aVec = glMatrix.vec3.fromValues(ax, ay, az);
                const rotated = glMatrix.vec3.create();
                glMatrix.vec3.transformQuat(rotated, aVec, q);
                val = [rotated[0] * L, rotated[1] * L, rotated[2] * L];
                break;
            }
            default:
                throw Error("Invalid type");
        }

        return {'value': {value: val, type: typeIndexA}};
    }
}
