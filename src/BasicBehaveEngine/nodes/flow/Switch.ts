import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class Switch extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {cases: {}};
    REQUIRED_VALUES = {selection: {}};

    _cases: number[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Switch";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {cases} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._cases = cases;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        this.graphEngine.clearValueEvaluationCache();
        const {selection} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        const selected = this.flows[selection]

        if (selected === undefined) {
            if (this.flows.default != null) {
                this.processFlow(this.flows.default);
            }
        } else {
            this.processFlow(this.flows[selection])
        }
    }
}
