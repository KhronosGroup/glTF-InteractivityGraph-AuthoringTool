import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class Switch extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "cases"}]
    REQUIRED_VALUES = [{id:"selection"}];

    _cases: number[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Switch";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {cases} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._cases = JSON.parse(cases);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        this.graphEngine.clearValueEvaluationCache();
        const {selection} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
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
