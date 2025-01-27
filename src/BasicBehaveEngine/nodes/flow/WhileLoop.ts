import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class WhileLoop extends BehaveEngineNode {
    REQUIRED_VALUES = {condition: {}};

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "WhileLoop";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration)
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        this.graphEngine.clearValueEvaluationCache();
        let condition = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES)).condition;
        while (condition) {
            if (this.flows.loopBody != null) {
                this.processFlow(this.flows.loopBody);
            }
            this.graphEngine.clearValueEvaluationCache();
            condition = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES)).condition;
        }

        if (this.flows.completed != null) {
            this.processFlow(this.flows.completed);
        }
    }
}
