import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class SetDelay extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"duration"}]
    _runningDelayIndices: number[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "SetDelay";
        this.validateValues(this.values);
        this.validateFlows(this.flows);

        this._runningDelayIndices = [];
        this.outValues.lastDelayIndex = {id: "lastDelayIndex", value: [-1], type: this.getTypeIndex('int')}
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        const {duration} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);

        if (flowSocket === "cancel") {
            this.outValues.lastDelayIndex = {id: "lastDelayIndex", value: [-1], type: this.getTypeIndex('int')}
            for (let i = 0; i < this._runningDelayIndices.length; i++) {
                const delayId = this.graphEngine.getScheduledDelay(this._runningDelayIndices[i]);
                clearTimeout(delayId);
                this._runningDelayIndices = [];
            }
            return;
        }

        if (isNaN(duration) || !isFinite(duration) || duration < 0) {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
        } else {
            const delayIndex = this.graphEngine.scheduledDelays.length;
            const delayId = setTimeout(() => {
                this.addEventToWorkQueue(this.flows.completed);
            }, duration * 1000);
            this.graphEngine.pushScheduledDelay(delayId);
            this._runningDelayIndices.push(delayIndex);
            this.outValues.lastDelayIndex = {id: "lastDelayIndex", value: [delayIndex], type: this.getTypeIndex('int')}

            this.processFlow(this.flows.out);
        }
    }
}
