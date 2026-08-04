import { cubicBezierEase, easeFloat, easeFloat3 } from '../src/BasicBehaveEngine/easingUtils';

describe('cubicBezierEase', () => {
    // The easing function is a function of x (input progress), not of the bezier parameter:
    // it must solve Bx(s) = x before returning By(s), matching CSS cubic-bezier().
    it('is the identity for the linear curve', () => {
        expect(cubicBezierEase(0.25, [0, 0], [1, 1])).toBeCloseTo(0.25, 6);
        expect(cubicBezierEase(0.5, [0, 0], [1, 1])).toBeCloseTo(0.5, 6);
        expect(cubicBezierEase(0.75, [0, 0], [1, 1])).toBeCloseTo(0.75, 6);
    });

    it('matches the CSS keyword curves', () => {
        // ease, ease-in and ease-out at the midpoint
        expect(cubicBezierEase(0.5, [0.25, 0.1], [0.25, 1])).toBeCloseTo(0.802403, 5);
        expect(cubicBezierEase(0.5, [0.42, 0], [1, 1])).toBeCloseTo(0.315357, 5);
        expect(cubicBezierEase(0.5, [0, 0], [0.58, 1])).toBeCloseTo(0.684643, 5);
    });

    it('is symmetric for ease-in-out', () => {
        const p1: [number, number] = [0.42, 0];
        const p2: [number, number] = [0.58, 1];
        expect(cubicBezierEase(0.5, p1, p2)).toBeCloseTo(0.5, 6);
        expect(cubicBezierEase(0.25, p1, p2)).toBeCloseTo(0.129162, 5);
        expect(cubicBezierEase(0.25, p1, p2) + cubicBezierEase(0.75, p1, p2)).toBeCloseTo(1, 6);
    });

    it('differs from a raw parametric evaluation at the same t', () => {
        // sanity guard against regressing to "evaluate the bezier at t and take y": for ease-in
        // the parametric y at t = 0.5 is 0.5, while the easing function value is ~0.3154
        expect(cubicBezierEase(0.5, [0.42, 0], [1, 1])).not.toBeCloseTo(0.5, 2);
    });

    it('pins the end points and handles a degenerate horizontal slope', () => {
        expect(cubicBezierEase(0, [0.42, 0], [0.58, 1])).toBe(0);
        expect(cubicBezierEase(1, [0.42, 0], [0.58, 1])).toBe(1);
        // p1.x = p2.x = 0 makes Bx'(0) zero, which the bisection fallback has to cover
        expect(cubicBezierEase(0.5, [0, 0], [0, 1])).toBeCloseTo(0.889882, 5);
    });

    it('allows the output progress to leave [0, 1] for overshoot curves', () => {
        // the spec's authoring note explicitly permits q outside [0, 1]
        expect(cubicBezierEase(0.5, [0.34, 1.56], [0.64, 1])).toBeCloseTo(1.087401, 5);
        expect(cubicBezierEase(0.5, [0.36, 0], [0.66, -0.56])).toBeCloseTo(-0.087401, 5);
    });
});

describe('easingUtils', () => {
    it('should interpolate a float value update', () => {
        const resLinear = easeFloat(0.4, {initialValue:0, targetValue:10, easingType: 2});
        expect(resLinear).toBe(4);
    });
    it('should interpolate a float3', () => {
        const startFloat3 = [1, 10, 100]
        const endFloat3 = [2, 20, 200];

        const resLinear = easeFloat3(0.5, {initialValue: startFloat3, targetValue: endFloat3, easingType: 2});
        expect(resLinear[0]).toBe(1.5);
        expect(resLinear[1]).toBe(15);
        expect(resLinear[2]).toBe(150);

    });
});
