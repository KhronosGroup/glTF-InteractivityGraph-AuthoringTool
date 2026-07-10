import {
    IInteractivityConfigurationValue,
    IInteractivityValue,
} from "../BasicBehaveEngine/types/InteractivityGraph";
import { AuthoredValue } from "./spec/AuthoredGraph";

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
