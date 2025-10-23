export const flattenMatrix = (matrix: number[][]): number[] => {
    return matrix.flat();
}

export const unflattenMatrix = (flatMatrix: number[], dimension: number): number[][] => {
    return flatMatrix.reduce((acc, val, index) => {
        const row = Math.floor(index / dimension);
        const col = index % dimension;
        if (!acc[row]) {
            acc[row] = [];
        }
        acc[row][col] = val;
        return acc;
    }, [] as number[][]);
}