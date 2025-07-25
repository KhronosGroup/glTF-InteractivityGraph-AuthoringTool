import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class CancelDelay extends BehaveEngineNode {
    REQUIRED_VALUES = {delayIndex: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CancelDelay";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        const {delayIndex} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
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
