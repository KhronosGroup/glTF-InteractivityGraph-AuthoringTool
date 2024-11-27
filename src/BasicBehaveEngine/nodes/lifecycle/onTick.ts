import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OnTickNode extends BehaveEngineNode {

    _startTime = NaN;
    _lastTickTime = NaN;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "OnTick";

        this.outValues.timeSinceStart = {id: "timeSinceStart", value: [NaN], type: this.getTypeIndex('float')};
        this.outValues.timeSinceLastTick = {id: "timeSinceLastTick", value: [NaN], type: this.getTypeIndex('float')};
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        const tickTime = Date.now();
        if (isNaN(this._startTime)) {
            this.outValues.timeSinceStart = {id: "timeSinceStart", value: [0], type: this.getTypeIndex('float')};
            this.outValues.timeSinceLastTick = {id: "timeSinceLastTick", value: [0], type: this.getTypeIndex('float')};
            this._startTime = tickTime;
        } else {
            this.outValues.timeSinceStart = {id: "timeSinceStart", value: [tickTime - this._startTime], type: this.getTypeIndex('float')};
            this.outValues.timeSinceLastTick = {id: "timeSinceLastTick", value: [tickTime - this._lastTickTime], type: this.getTypeIndex('float')};
        }
        this._lastTickTime = tickTime;
        return super.processNode(flowSocket);
    }
}
