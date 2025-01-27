import { IInteractivityVariable } from "../../../types/InteractivityGraph";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class VariableSet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {variable: {}}

    _variable: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "VariableSet";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {variable} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._variable = variable;
    }

    override processNode(flowSocket?:string) {
        this.graphEngine.clearValueEvaluationCache();
        const vals = this.evaluateAllValues(["value"]);
        this.graphEngine.processNodeStarted(this);

        this.variables[this._variable].value = vals["value"];

        super.processNode(flowSocket);
    }
}
