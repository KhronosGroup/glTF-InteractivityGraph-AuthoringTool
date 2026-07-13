import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class SetDelay extends BehaveEngineNode {
    REQUIRED_VALUES = {duration: {}}
    _runningDelayIndices: number[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "SetDelay";
        this.validateValues(this.values);

        this._runningDelayIndices = [];
        this.outValues.lastDelay = { value: [null], type: this.getTypeIndex('ref')}
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);

        if (flowSocket === "cancel") {
            this.outValues.lastDelay = { value: [null], type: this.getTypeIndex('ref')}
            for (const delayIndex of this._runningDelayIndices) {
                this.graphEngine.cancelScheduledDelay(delayIndex);
            }
            this._runningDelayIndices = [];
            return;
        }

        this.graphEngine.clearValueEvaluationCache();
        const {duration} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));

        if (isNaN(duration) || !isFinite(duration) || duration < 0) {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
        } else {
            const delayIndex = this.graphEngine.scheduledDelays.length;
            const delayId = setTimeout(() => {
                this.graphEngine.removeScheduledDelay(delayIndex);
                this.addEventToWorkQueue(this.flows.done);
            }, duration * 1000);
            this.graphEngine.pushScheduledDelay(delayId);
            this._runningDelayIndices.push(delayIndex);
            this.outValues.lastDelay = { value: [`/extensions/KHR_interactivity/delays/${delayIndex}`], type: this.getTypeIndex('ref')}

            this.processFlow(this.flows.out);
        }
    }
}
