import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class AnimationStop extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"animation"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "AnimationStop";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string): void {
        const {animation} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);

        if (this.graphEngine.getWorld().animations.length <= animation || animation < 0) {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
        } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.graphEngine.stopAnimation(animation);

            if (this.flows.out) {
                this.processFlow(this.flows.out);
            }
        }
    }
}
