import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class Throttle extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"duration"}];

    _lastRemainingTime: number;
    _lastSuccessfulCall: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Throttle";
        this.validateValues(this.values);
        this.validateFlows(this.flows);

        this._lastRemainingTime = NaN;
        this.outValues.lastRemainingTime = {id: "lastRemainingTime", value: [NaN], type: this.getTypeIndex('float')};
        this._lastSuccessfulCall = 0;
    }

    override processNode(flowSocket?: string) {
        if (flowSocket === "reset") {
            this.outValues.lastRemainingTime = {id: "lastRemainingTime", value: [NaN], type: this.getTypeIndex('float')};
            return;
        }

        this.graphEngine.clearValueEvaluationCache();
        const {duration} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        if (isNaN(duration) || !isFinite(duration) || duration < 0) {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
        } else {
            const now = Date.now();
            if (!isNaN(this._lastRemainingTime)) {
                const timeSinceLastCall = now - this._lastSuccessfulCall;
                if (timeSinceLastCall <= duration * 1000) {
                    // throttle
                    this._lastRemainingTime = duration - timeSinceLastCall/1000;
                    this.outValues.lastRemainingTime = {id: "lastRemainingTime", value: [duration - timeSinceLastCall/1000], type: this.getTypeIndex('float')};
                    return;
                }
            }

            this._lastRemainingTime = 0;
            this.outValues.lastRemainingTime = {id: "lastRemainingTime", value: [0], type: this.getTypeIndex('float')};
            this._lastSuccessfulCall = now;
            super.processNode(flowSocket);
        }
    }
}
