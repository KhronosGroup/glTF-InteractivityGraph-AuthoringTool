import {
    IInteractivityConfigurationValue,
    IInteractivityDeclaration,
    IInteractivityFlow,
    IInteractivityValue,
} from "../BasicBehaveEngine/types/InteractivityGraph";
import { AuthoredNode, AuthoredValue } from "./spec/AuthoredGraph";

/**
 * An editor placeholder (undefined/null, or NaN for an unset float) cannot be exported: JSON has no
 * NaN/Infinity and turns undefined into null, neither of which is a valid spec literal.
 */
const hasUnsetComponent = (value: unknown[] | undefined): boolean =>
    !Array.isArray(value)
    || value.some((component) => component == null || (typeof component === "number" && !Number.isFinite(component)));

/** Project an editor value socket down to the fields allowed in an executable graph. */
export const toExecutableValue = (authoredValue: AuthoredValue): IInteractivityValue => {
    const value = { ...authoredValue };
    delete value.description;
    delete value.typeGroup;
    delete value.typeOptions;
    delete value.objectPicker;
    // spec type-default: an unset input exports with only `type` (no value, no node)
    if (value.node === undefined && (value.typeDefault || hasUnsetComponent(value.value))) {
        delete value.value;
    }
    delete value.typeDefault;
    return value;
};

/** Unset configuration values are omitted, so the spec default (or the graph's rejection) applies. */
export const isUnsetConfigurationValue = (value: IInteractivityConfigurationValue): boolean =>
    hasUnsetComponent(value.value);

/** Unconnected output flows are omitted; the spec schema requires a target node for every entry. */
export const toExecutableFlows = (flows: Record<string, IInteractivityFlow> | undefined): Record<string, IInteractivityFlow> =>
    Object.fromEntries(Object.entries(flows ?? {}).filter(([, flow]) => flow?.node !== undefined));

/** Spec schema: graph-level arrays are omitted rather than empty. */
export const omitEmptyGraphArrays = <T extends object>(graph: T): T =>
    Object.fromEntries(
        Object.entries(graph).filter(([, entry]) => !Array.isArray(entry) || entry.length > 0)
    ) as T;

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
