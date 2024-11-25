import {BehaveEngineNode, IBehaviourNodeProps, IValue} from "../../BehaveEngineNode";

export class VariableGet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "variable"}]

    _variable: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "VariableGetNode";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {variable} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._variable = variable;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);

        const result: Record<string, IValue> = {};
        const res = this.variables[this._variable];
        // TODO It's unclear when the value needs to be a glTF value (always an array)
        // or when it needs to be the actual value. Since the result of this node is always parsed
        // with parseType, it currently needs to be an array.
        if (!Array.isArray(res.value)) res.value = [res.value];
        result["value"] = res;
        return result;
    }
}
