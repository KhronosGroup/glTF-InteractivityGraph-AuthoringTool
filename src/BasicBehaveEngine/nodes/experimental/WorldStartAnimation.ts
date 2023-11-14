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
        if (speed <= 0) {
            throw Error(`Animation speed must be strictly positive, received ${speed}`);
        }
        //TODO: add clause to enforce startTime is before animation end time
        if (startTime < 0) {
            throw Error(`Animation startTime must be between 0 and animation end time, received ${speed}`);
        }
        this.graphEngine.processNodeStarted(this);

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
