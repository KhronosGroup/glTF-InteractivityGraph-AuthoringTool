import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class Throttle extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"delay"}];

    _isThrottling: boolean;
    _lastSuccessfulCall: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Throttle";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.outValues.isThrottling = {id: "isThrottling", value: false};

        this._isThrottling = false;
        this._lastSuccessfulCall = 0;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        const {delay} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        const now = Date.now();
        if (now - this._lastSuccessfulCall <= delay * 1000) {
            // throttle
            this._isThrottling = true;
            this.outValues['isThrottling'].value = true;
            return;
        } else {
            this._isThrottling = false;
            this.outValues['isThrottling'].value = false;
        }

        this._lastSuccessfulCall = now;
        super.processNode(flowSocket);
    }
}
