import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class AnimationStopAt extends BehaveEngineNode {
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

        const animationIndex = this.refToIndex(animation);

        if (this.graphEngine.getWorld().animations.length <= animationIndex || animationIndex < 0) {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
        } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.graphEngine.stopAnimationAt(animationIndex, stopTime, () => {
                if (this.flows.done) {
                    this.addEventToWorkQueue(this.flows.done);
                }
            });


            if (this.flows.out) {
                this.processFlow(this.flows.out);
            }
        }
    }
}
