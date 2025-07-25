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

        if (speed <= 0 || this.graphEngine.getWorld().animations.length <= animation || animation < 0) {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
        } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.graphEngine.startAnimation(animation, startTime, endTime, speed, () => {
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
