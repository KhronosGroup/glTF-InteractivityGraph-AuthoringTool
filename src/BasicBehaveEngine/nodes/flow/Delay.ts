import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class Delay extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"duration"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Delay";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        const {duration} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        setTimeout(() => {
            this.addEventToWorkQueue(this.flows.out)
        }, duration * 1000)

    }
}
