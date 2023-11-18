import { easeFloat, easeFloat3 } from '../src/BasicBehaveEngine/easingUtils';

describe('easingUtils', () => {
    it('should interpolate a float value update', () => {
        const resLinear = easeFloat(0.4, 0, 10, 0);
        expect(resLinear).toBe(4);
    });
    it('should interpolate a float3', () => {
        const startFloat3 = [1, 10, 100]
        const endFloat3 = [2, 20, 200];

        const resLinear = easeFloat3(0.5, startFloat3, [2, 20, 200], 0);
        expect(resLinear[0]).toBe(1.5);
        expect(resLinear[1]).toBe(15);
        expect(resLinear[2]).toBe(150);

    });
});
