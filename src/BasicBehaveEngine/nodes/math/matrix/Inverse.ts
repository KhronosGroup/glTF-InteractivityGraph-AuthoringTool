import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class Inverse extends BehaveEngineNode {
    REQUIRED_VALUES = {a: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "InverseNode";
        this.validateValues(this.values);
    }

    static createIdentityMatrix():number[][] {
        return [
            [1, 0, 0, 0,],
            [0, 1, 0, 0,],
            [0, 0, 1, 0,],
            [0, 0, 0, 1]
        ];
    }

    static invert4x4(matrix: number[][]): number[][] {
        const [[m11, m21, m31, m41], [m12, m22, m32, m42], [m13, m23, m33, m43], [m14, m24, m34, m44]] = matrix;
    
        const cofactor11 = m22 * (m33 * m44 - m34 * m43) - m32 * (m23 * m44 - m24 * m43) + m42 * (m23 * m34 - m24 * m33);
        const cofactor12 = -(m21 * (m33 * m44 - m34 * m43) - m31 * (m23 * m44 - m24 * m43) + m41 * (m23 * m34 - m24 * m33));
        const cofactor13 = m21 * (m32 * m44 - m34 * m42) - m31 * (m22 * m44 - m24 * m42) + m41 * (m22 * m33 - m23 * m32);
        const cofactor14 = -(m21 * (m32 * m43 - m33 * m42) - m31 * (m22 * m43 - m23 * m42) + m41 * (m22 * m33 - m23 * m32));
    
        const determinant = m11 * cofactor11 + m12 * cofactor12 + m13 * cofactor13 + m14 * cofactor14;
    
        if (determinant === 0) {
            console.error("Matrix is not invertible.");
            return this.createIdentityMatrix(); // Assuming createIdentityMatrix is a valid function in your context
        }
    
        const inverseDeterminant = 1 / determinant;
    
        const result: number[][] = [
            [cofactor11 * inverseDeterminant,
            cofactor12 * inverseDeterminant,
            cofactor13 * inverseDeterminant,
            cofactor14 * inverseDeterminant],
            [-(m12 * (m33 * m44 - m34 * m43) - m32 * (m13 * m44 - m14 * m43) + m42 * (m13 * m34 - m14 * m33)) * inverseDeterminant,
            m11 * (m33 * m44 - m34 * m43) - m31 * (m13 * m44 - m14 * m43) + m41 * (m13 * m34 - m14 * m33) * inverseDeterminant,
            -(m11 * (m32 * m44 - m34 * m42) - m31 * (m12 * m44 - m14 * m42) + m41 * (m12 * m34 - m14 * m32)) * inverseDeterminant,
            m11 * (m32 * m43 - m33 * m42) - m31 * (m12 * m43 - m13 * m42) + m41 * (m12 * m33 - m13 * m32) * inverseDeterminant],
            [m12 * (m23 * m44 - m24 * m43) - m22 * (m13 * m44 - m14 * m43) + m42 * (m13 * m24 - m14 * m23) * inverseDeterminant,
            -(m11 * (m23 * m44 - m24 * m43) - m21 * (m13 * m44 - m14 * m43) + m41 * (m13 * m24 - m14 * m23)) * inverseDeterminant,
            m11 * (m22 * m44 - m24 * m42) - m21 * (m12 * m44 - m14 * m42) + m41 * (m12 * m24 - m14 * m22) * inverseDeterminant,
            -(m11 * (m22 * m43 - m23 * m42) - m21 * (m12 * m43 - m13 * m42) + m41 * (m12 * m23 - m13 * m22)) * inverseDeterminant],
            [-(m12 * (m23 * m34 - m24 * m33) - m22 * (m13 * m34 - m14 * m33) + m32 * (m13 * m24 - m14 * m23)) * inverseDeterminant,
            m11 * (m23 * m34 - m24 * m33) - m21 * (m13 * m34 - m14 * m33) + m31 * (m13 * m24 - m14 * m23) * inverseDeterminant,
            -(m11 * (m22 * m34 - m24 * m32) - m21 * (m12 * m34 - m14 * m32) + m31 * (m12 * m24 - m14 * m22)) * inverseDeterminant,
            m11 * (m22 * m33 - m23 * m32) - m21 * (m12 * m33 - m13 * m32) + m31 * (m12 * m23 - m13 * m22) * inverseDeterminant]
        ];
    
        return result;
    }

    override processNode(flowSocket?: string) {
        const {a} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        const typeIndex = this.values['a'].type!
        const type: string = this.getType(typeIndex);
        let val: any;

        switch (type) {
            case "float4x4":
                val = Inverse.invert4x4(a);
                break;
            default:
                throw Error("Invalid type")
        }

        return {'value': {value: val, type: typeIndex}}
    }
}
