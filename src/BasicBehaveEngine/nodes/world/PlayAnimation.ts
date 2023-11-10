import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PlayAnimation extends BehaveEngineNode {
    REQUIRED_VALUES = [{id: "animation"}, {id: "speed"}, {id: "loopCount"},  {id: "targetTime"}]

    _animation: number;
    _speed: number;
    _loopCount: number;
    _targetTime: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PlayAnimation";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {animation, speed, loopCount, targetTime} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));

        this._animation = animation;
        this._speed = speed;
        this._loopCount = loopCount;
        this._targetTime = targetTime;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();

        const {animation, speed, loopCount, targetTime} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));

        this._animation = animation;
        this._speed = speed;
        this._loopCount = loopCount;
        this._targetTime = targetTime;

        this.graphEngine.processNodeStarted(this);

        console.log("trying to run play animation animation path value");
        //const storeThisProcessNode = super.processNode;
        const that = this;

        this.graphEngine.runEngineCallback("playAnimation", {animation, speed, loopCount, targetTime}, function() {
            if (that.flows.done) {
                that.addEventToWorkQueue(that.flows.done)
            }
        });
    }
}
