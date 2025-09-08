import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class VariableSet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {variable: {}}
    REQUIRED_VALUES = {value: {}}

    _variable: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "VariableSet";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {variable} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._variable = variable[0];
    }

    override processNode(flowSocket?:string) {
        this.graphEngine.clearValueEvaluationCache();
        const {value} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);

        this.graphEngine.clearVariableInterpolation(this._variable);

        if (Array.isArray(value)) {
            this.variables[this._variable].value = value;
        } else {
            this.variables[this._variable].value = [value];
        }

        super.processNode(flowSocket);
    }
}
