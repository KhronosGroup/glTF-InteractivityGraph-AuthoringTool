import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

// Matrix constants from the OkLab paper (optimized for double-precision)
// Step 1: Lab -> LMS
const M3 = [
    [1.0, +0.3963377774, +0.2158037573],
    [1.0, -0.1055613458, -0.0638541728],
    [1.0, -0.0894841775, -1.2914855480]
];

// Step 2: LMS^3 -> linear RGB
const M4 = [
    [+4.0767416621, -3.3077115913, +0.2309699292],
    [-1.2684380046, +2.6097574011, -0.3413193965],
    [-0.0041960863, -0.7034186147, +1.7076147010]
];

export class RgbFromOkLCh extends BehaveEngineNode {
    REQUIRED_VALUES = {l: {}, c: {}, h: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "RgbFromOkLChNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {l, c, h} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);

        const typeIndexFloat = this.getTypeIndex("float");

        const L = Number(l);
        const C = Number(c);
        const H = Number(h);

        const aOk = C * Math.cos(H);
        const bOk = C * Math.sin(H);

        // LMS = M3 * [L, a, b]
        const Lp = M3[0][0] * L + M3[0][1] * aOk + M3[0][2] * bOk;
        const Mp = M3[1][0] * L + M3[1][1] * aOk + M3[1][2] * bOk;
        const Sp = M3[2][0] * L + M3[2][1] * aOk + M3[2][2] * bOk;

        // RGB = M4 * [Lp^3, Mp^3, Sp^3]
        const Lp3 = Lp * Lp * Lp;
        const Mp3 = Mp * Mp * Mp;
        const Sp3 = Sp * Sp * Sp;

        const rv = M4[0][0] * Lp3 + M4[0][1] * Mp3 + M4[0][2] * Sp3;
        const gv = M4[1][0] * Lp3 + M4[1][1] * Mp3 + M4[1][2] * Sp3;
        const bv = M4[2][0] * Lp3 + M4[2][1] * Mp3 + M4[2][2] * Sp3;

        return {
            'r': {value: [rv], type: typeIndexFloat},
            'g': {value: [gv], type: typeIndexFloat},
            'b': {value: [bv], type: typeIndexFloat}
        };
    }
}
