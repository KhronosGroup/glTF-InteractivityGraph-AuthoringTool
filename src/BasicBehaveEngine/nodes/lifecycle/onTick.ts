import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OnTickNode extends BehaveEngineNode {

    _startTime = NaN;
    _lastTickTime = NaN;
    _floatTypeIndex = -1;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "OnTick";
        this._floatTypeIndex = this.getTypeIndex('float');
        this.outValues.timeSinceStart = { value: [NaN], type: this._floatTypeIndex };
        this.outValues.timeSinceLastTick = { value: [NaN], type: this._floatTypeIndex };
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        const tickTime = Date.now() / 1000;
        if (isNaN(this._startTime)) {
            this.outValues.timeSinceStart = { value: [0], type: this._floatTypeIndex };
            this.outValues.timeSinceLastTick = { value: [NaN], type: this._floatTypeIndex };
            this._startTime = tickTime;
        } else {
            this.outValues.timeSinceStart = { value: [tickTime - this._startTime], type: this._floatTypeIndex };
            this.outValues.timeSinceLastTick = { value: [tickTime - this._lastTickTime], type: this._floatTypeIndex };
        }
        this._lastTickTime = tickTime;
        return super.processNode(flowSocket);
    }
}
