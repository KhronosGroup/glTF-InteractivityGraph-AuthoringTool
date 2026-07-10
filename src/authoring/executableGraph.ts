import {
    IInteractivityConfigurationValue,
    IInteractivityDeclaration,
    IInteractivityValue,
} from "../BasicBehaveEngine/types/InteractivityGraph";
import { AuthoredNode, AuthoredValue } from "./spec/AuthoredGraph";

/** Project an editor value socket down to the fields allowed in an executable graph. */
export const toExecutableValue = (authoredValue: AuthoredValue): IInteractivityValue => {
    const value = { ...authoredValue };
    delete value.description;
    delete value.typeGroup;
    delete value.typeOptions;
    return value;
};

/** Remove spec/UI help text before a node configuration is serialized. */
export const toExecutableConfigurationValue = (
    authoredValue: IInteractivityConfigurationValue
): IInteractivityConfigurationValue => {
    const value = { ...authoredValue };
    delete value.description;
    return value;
};

export const getExecutableDeclarationIndex = (
    node: AuthoredNode,
    declarations: IInteractivityDeclaration[]
): number => {
    if (
        Number.isInteger(node.declaration)
        && node.declaration >= 0
        && declarations[node.declaration]?.op === node.op
    ) {
        return node.declaration;
    }

    return declarations.findIndex((declaration: IInteractivityDeclaration) => declaration.op === node.op);
};
