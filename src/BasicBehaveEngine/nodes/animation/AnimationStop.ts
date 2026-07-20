import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class AnimationStop extends BehaveEngineNode {
    REQUIRED_VALUES = {animation: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "AnimationStop";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string): void {
        this.graphEngine.clearValueEvaluationCache();
        const {animation} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);

        const animationIndex = this.resolveRef(animation);

        const validAnimation = this.graphEngine.getWorld().animations.length > animationIndex && animationIndex >= 0;

        if (validAnimation) {
            this.graphEngine.animationCompletionCallbacks.delete(animationIndex);

            this.graphEngine.stopAnimation(animationIndex);

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
