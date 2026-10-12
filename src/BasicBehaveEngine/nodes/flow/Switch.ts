import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class Switch extends BehaveEngineNode {
    INPUT_FLOWS = ["in"];
    REQUIRED_CONFIGURATIONS = {cases: {defaultValue: []}};
    REQUIRED_VALUES = {selection: {}};

    _cases: number[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Switch";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {cases} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        // spec: non-int32 cases -> default configuration (no cases); duplicate cases are ignored
        const isValid = Array.isArray(cases) && cases.every(c => c === (c | 0));
        this._cases = isValid ? [...new Set<number>(cases)] : [];
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        this.graphEngine.clearValueEvaluationCache();
        const {selection} = this.evaluateRequiredValues();
        // spec: only configured cases route to their flow; anything else takes the default flow
        const selected = this._cases.includes(Number(selection)) ? this.flows[String(selection)] : this.flows.default;
        if (selected != null) {
            this.processFlow(selected);
        }
    }
}
