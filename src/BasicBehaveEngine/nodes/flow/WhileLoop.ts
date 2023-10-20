import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class WhileLoop extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "isDo"}]
    REQUIRED_VALUES = [{id:"condition"}];

    _isDo: boolean;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "WhileLoop";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration)

        const {isDo} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._isDo = isDo;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        let condition;
        if (this._isDo) {
            do {
                if (this.flows.loopBody != null) {
                    this.processFlow(this.flows.loopBody);
                }
                this.graphEngine.clearValueEvaluationCache();
                condition = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id)).condition;
            } while (condition)

        } else {
            this.graphEngine.clearValueEvaluationCache();
            condition = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id)).condition;
            while (condition) {
                if (this.flows.loopBody != null) {
                    this.processFlow(this.flows.loopBody);
                }
                this.graphEngine.clearValueEvaluationCache();
                condition = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id)).condition;
            }
        }

        if (this.flows.completed != null) {
            this.processFlow(this.flows.completed);
        }
    }
}
