import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class CancelDelay extends BehaveEngineNode {
    REQUIRED_VALUES = {delay: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CancelDelay";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        const {delay} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        if (delay < 0 || delay >= this.graphEngine.scheduledDelays.length) {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
        } else {
            const delayId = this.graphEngine.getScheduledDelay(delay);
            clearTimeout(delayId);

            this.processFlow(this.flows.out);
        }
    }
}
