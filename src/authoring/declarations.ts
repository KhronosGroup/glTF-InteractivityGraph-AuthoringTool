import type { IInteractivityDeclaration } from "../BasicBehaveEngine/types/InteractivityGraph";

/** Add an operation declaration if needed and return its index in the current graph. */
export const ensureInteractivityDeclaration = (
    declarations: IInteractivityDeclaration[],
    declaration: IInteractivityDeclaration,
): number => {
    const existingIndex = declarations.findIndex((candidate) => candidate.op === declaration.op);
    if (existingIndex >= 0) {
        return existingIndex;
    }
    declarations.push(declaration);
    return declarations.length - 1;
};
