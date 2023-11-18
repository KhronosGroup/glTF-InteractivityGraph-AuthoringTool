/**
 * Eases a floating-point value from its initial value to its target value over time.
 *
 * @param t - The current progress (between 0 and 1) of the easing animation.
 * @param initialVal - The initial value of the property.
 * @param targetVal - The target value of the property after the animation.
 * @param type - The type of easing to apply (e.g., "linear" for linear easing).
 * @returns The eased floating-point value at the current progress.
 */
import {Quaternion} from "@babylonjs/core";

export const easeFloat = (t: number, initialVal: number, targetVal: number, type: number): number => {
    if (type === 0) {
        return initialVal + (targetVal - initialVal) * t;
    } else {
        // default to immediate
        return targetVal;
    }
}

/**
 * Eases an array of three floating-point values from their initial values to their target values over time.
 *
 * @param t - The current progress (between 0 and 1) of the easing animation.
 * @param initialVal - An array of three initial values.
 * @param targetVal - An array of three target values.
 * @param type - The type of easing to apply (e.g., "linear" for linear easing).
 * @returns An array of eased floating-point values at the current progress.
 */
export const easeFloat3 = (t: number, initialVal: number[], targetVal: number[], type: number): number[] => {
    return [
        easeFloat(t, initialVal[0], targetVal[0], type),
        easeFloat(t, initialVal[1], targetVal[1], type),
        easeFloat(t, initialVal[2], targetVal[2], type)
    ]
}

/**
 * Eases an array of four floating-point values from their initial values to their target values over time.
 *
 * @param t - The current progress (between 0 and 1) of the easing animation.
 * @param initialVal - An array of three initial values.
 * @param targetVal - An array of three target values.
 * @param type - The type of easing to apply (e.g., "linear" for linear easing).
 * @returns An array of eased floating-point values at the current progress.
 */
export const easeFloat4 = (t: number, initialVal: number[], targetVal: number[], type: number): number[] => {
    if (type === 1) {
        const q1 = new Quaternion(initialVal[1], initialVal[2], initialVal[3], initialVal[0]);
        const q2 = new Quaternion(targetVal[1], targetVal[2], targetVal[3], targetVal[0]);

        const outQuat = Quaternion.Zero();
        Quaternion.SmoothToRef(q1, q2, t, 1, outQuat);
        return [outQuat.w, outQuat.x, outQuat.y, outQuat.z];
    } else {
        return [
            easeFloat(t, initialVal[0], targetVal[0], type),
            easeFloat(t, initialVal[1], targetVal[1], type),
            easeFloat(t, initialVal[2], targetVal[2], type)
        ]
    }
}
