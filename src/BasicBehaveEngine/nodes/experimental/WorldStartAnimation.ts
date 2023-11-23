import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class WorldStartAnimation extends BehaveEngineNode {
    REQUIRED_VALUES = [{id: "animation"}, {id:"startTime"}, {id:"endTime"}, {id:"speed"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "WorldStartAnimation";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string): void {
        const {animation, startTime, endTime, speed} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));

        this.graphEngine.processNodeStarted(this);

        if (speed <= 0 || this.graphEngine.getWorld().animations.length <= animation || animation < 0) {
            if (this.flows.failed) {
                this.processFlow(this.flows.failed);
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
