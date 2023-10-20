/**
 * Eases a floating-point value from its initial value to its target value over time.
 *
 * @param t - The current progress (between 0 and 1) of the easing animation.
 * @param initialVal - The initial value of the property.
 * @param targetVal - The target value of the property after the animation.
 * @param type - The type of easing to apply (e.g., "linear" for linear easing).
 * @returns The eased floating-point value at the current progress.
 */
export const easeFloat = (t: number, initialVal: number, targetVal: number, type: string): number => {
    if (type === "linear") {
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
export const easeFloat3 = (t: number, initialVal: number[], targetVal: number[], type: string): number[] => {
    return [
        easeFloat(t, initialVal[0], targetVal[0], type),
        easeFloat(t, initialVal[1], targetVal[1], type),
        easeFloat(t, initialVal[2], targetVal[2], type)
    ]
}
