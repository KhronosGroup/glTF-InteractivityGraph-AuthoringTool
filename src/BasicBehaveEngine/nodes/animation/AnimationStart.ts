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
        
        const animationIndex = this.refToIndex(animation);

        const validAnimation = this.graphEngine.getWorld().animations.length > animationIndex && animationIndex >= 0;
        const validStartTime = !isNaN(startTime) && isFinite(startTime);
        const validEndTime = !isNaN(endTime) && isFinite(endTime);
        const validSpeed = !isNaN(speed) && isFinite(speed) && speed > 0;

        if (validAnimation && validStartTime && validEndTime && validSpeed) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.graphEngine.startAnimation(animationIndex, startTime, endTime, speed, () => {
                if (this.flows.done) {
                    this.addEventToWorkQueue(this.flows.done);
                }
            });

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
