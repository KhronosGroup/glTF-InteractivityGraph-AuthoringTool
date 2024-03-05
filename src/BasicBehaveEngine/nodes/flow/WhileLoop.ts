import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class WhileLoop extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"condition"}];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "WhileLoop";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration)
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        this.graphEngine.clearValueEvaluationCache();
        let condition = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id)).condition;
        while (condition) {
            if (this.flows.loopBody != null) {
                this.processFlow(this.flows.loopBody);
            }
            this.graphEngine.clearValueEvaluationCache();
            condition = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id)).condition;
        }

        if (this.flows.completed != null) {
            this.processFlow(this.flows.completed);
        }
    }
}
