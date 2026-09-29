import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class AnimationStopAt extends BehaveEngineNode {
    INPUT_FLOWS = ["in"];
    REQUIRED_VALUES = {animation: {}, stopTime: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "AnimationStopAt";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string): void {
        this.graphEngine.clearValueEvaluationCache();
        const {animation, stopTime} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);

        const animationIndex = this.resolveRef(animation);

        const validAnimation = this.graphEngine.getWorld().animations.length > animationIndex && animationIndex >= 0;
        // spec: only NaN is invalid; an out-of-range stop time lets the animation reach its end
        const validStopTime = !isNaN(stopTime);

        if (validAnimation && validStopTime) {
            this.graphEngine.stopAnimationAt(animationIndex, stopTime, () => {
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
