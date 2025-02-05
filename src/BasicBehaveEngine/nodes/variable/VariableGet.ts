import { IInteractivityValue } from "../../../types/InteractivityGraph";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class VariableGet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {variable: {}}

    _variable: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "VariableGetNode";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {variable} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._variable = variable;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);

        const variable = this.variables[this._variable];

        return {value: {value: variable.value!, type: variable.type}};
    }
}
