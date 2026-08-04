import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class AnimationStart extends BehaveEngineNode {
    REQUIRED_VALUES = {animation: {}, startTime: {}, endTime: {}, speed: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "AnimationStart";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string): void {
        this.graphEngine.clearValueEvaluationCache();
        const {animation, startTime, endTime, speed} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));

        this.graphEngine.processNodeStarted(this);
        
        const animationIndex = this.resolveRef(animation);

        const validAnimation = this.graphEngine.getWorld().animations.length > animationIndex && animationIndex >= 0;
        const validStartTime = !isNaN(startTime) && isFinite(startTime);
        // Infinite end times are valid and represent unbounded playback. Only the start time is
        // required to be finite by the KHR_interactivity animation/start operation.
        const validEndTime = !isNaN(endTime);
        const validSpeed = !isNaN(speed) && isFinite(speed) && speed > 0;

        if (validAnimation && validStartTime && validEndTime && validSpeed) {

            this.graphEngine.animationCompletionCallbacks.set(animationIndex, () => {
                if (this.flows.done) {
                    this.addEventToWorkQueue(this.flows.done);
                }
            });

            this.graphEngine.startAnimation(animationIndex, startTime, endTime, speed, () => this.graphEngine.completeAnimation(animationIndex));

            if (this.flows.out) {
                this.processFlow(this.flows.out);
            }
        } else {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
        }
    }
}
