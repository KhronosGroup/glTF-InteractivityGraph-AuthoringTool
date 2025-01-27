import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class Branch extends BehaveEngineNode {
    REQUIRED_VALUES = {condition: {}};

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Branch";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        const {condition} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);

        if (JSON.parse(condition)) {
            if (this.flows.true != null) {
                this.processFlow(this.flows.true);
            }
        } else {
            if (this.flows.false != null) {
                this.processFlow(this.flows.false);
            }
        }
    }
}
