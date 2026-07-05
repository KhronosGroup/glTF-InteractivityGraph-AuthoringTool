import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

// Matrix constants from the OkLab paper (optimized for double-precision)
// Step 1: linear RGB -> LMS
const M1 = [
    [0.4122214708, 0.5363325363, 0.0514459929],
    [0.2119034982, 0.6806995451, 0.1073969566],
    [0.0883024619, 0.2817188376, 0.6299787005]
];

// Step 2: LMS^(1/3) -> Lab
const M2 = [
    [+0.2104542553, +0.7936177850, -0.0040720468],
    [+1.9779984951, -2.4285922050, +0.4505937099],
    [+0.0259040371, +0.7827717662, -0.8086757660]
];

function cbrt(x: number): number {
    return Math.cbrt(x);
}

export class RgbToOkLCh extends BehaveEngineNode {
    REQUIRED_VALUES = {r: {}, g: {}, b: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "RgbToOkLChNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {r, g, b} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);

        const typeIndexFloat = this.getTypeIndex("float");

        const rv = Number(r);
        const gv = Number(g);
        const bv = Number(b);

        // LMS = M1 * [r, g, b]
        const Lp = M1[0][0] * rv + M1[0][1] * gv + M1[0][2] * bv;
        const Mp = M1[1][0] * rv + M1[1][1] * gv + M1[1][2] * bv;
        const Sp = M1[2][0] * rv + M1[2][1] * gv + M1[2][2] * bv;

        // Lab = M2 * [cbrt(Lp), cbrt(Mp), cbrt(Sp)]
        const cLp = cbrt(Lp);
        const cMp = cbrt(Mp);
        const cSp = cbrt(Sp);

        const L = M2[0][0] * cLp + M2[0][1] * cMp + M2[0][2] * cSp;
        const a = M2[1][0] * cLp + M2[1][1] * cMp + M2[1][2] * cSp;
        const bOk = M2[2][0] * cLp + M2[2][1] * cMp + M2[2][2] * cSp;

        const chroma = Math.sqrt(a * a + bOk * bOk);
        const hue = Math.atan2(bOk, a);

        return {
            'l': {value: [L], type: typeIndexFloat},
            'c': {value: [chroma], type: typeIndexFloat},
            'h': {value: [hue], type: typeIndexFloat}
        };
    }
}
