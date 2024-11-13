import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class CancelDelay extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"delayIndex"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CancelDelay";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        const {delayIndex} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        if (delayIndex < 0 || delayIndex >= this.graphEngine.scheduledDelays.length) {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
        } else {
            const delayId = this.graphEngine.getScheduledDelay(delayIndex);
            clearTimeout(delayId);

            this.processFlow(this.flows.out);
        }
    }
}
