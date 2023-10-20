import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class ForLoop extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"startIndex"}, {id:"increment"}, {id:"endIndex"}];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ForLoop";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        let {startIndex, increment, endIndex} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        this.outValues.index = {id: "index", value: 0}
        for (let i = Number(startIndex); i < Number(endIndex); i+= Number(increment)) {
            this.outValues.index = {id: "index", value: i}
            if (this.flows.loopBody != null) {
                this.processFlow(this.flows.loopBody);
            }

            this.graphEngine.clearValueEvaluationCache();
            const reEvaluatedValues: any = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
            startIndex = reEvaluatedValues.startIndex;
            increment = reEvaluatedValues.increment;
            endIndex = reEvaluatedValues.endIndex;
        }
        this.outValues.index = {id: "index", value: endIndex}
        if (this.flows.completed != null) {
            this.processFlow(this.flows.completed);
        }
    }
}
