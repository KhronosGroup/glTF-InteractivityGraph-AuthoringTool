import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class VariableSetMultiple extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {variables: {}}
    _variables: number[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "VariableSetMultiple";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {variables} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        if (typeof variables[0] === "string") {
            this._variables = JSON.parse(variables);
        } else {
            this._variables = variables;
        }
    }

    override processNode(flowSocket?:string) {
        this.graphEngine.clearValueEvaluationCache();
        const vals = this.evaluateAllValues(this._variables.map(variable => variable.toString()));
        
        this.graphEngine.processNodeStarted(this);
        for (const variableId of this._variables) {
            this.graphEngine.clearVariableInterpolation(variableId);
            const value = vals[variableId.toString()];
            if (Array.isArray(value)) {
                this.variables[variableId].value = value;
            } else {
                this.variables[variableId].value = [value];
            }
        }

        super.processNode(flowSocket);
    }
}
