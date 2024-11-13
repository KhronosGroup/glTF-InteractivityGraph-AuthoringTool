import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class AnimationStopAt extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"animation"}, {id: "stopTime"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "AnimationStopAt";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string): void {
        const {animation, stopTime} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);

        if (this.graphEngine.getWorld().length <= animation || animation < 0) {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
        } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.graphEngine.stopAnimationAt(animation, stopTime, () => {
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
