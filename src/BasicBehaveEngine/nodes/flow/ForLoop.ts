import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class ForLoop extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "initialIndex"}];
    REQUIRED_VALUES = [{id:"startIndex"}, {id:"endIndex"}];

    _initialIndex: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ForLoop";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {initialIndex} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._initialIndex = initialIndex;
        this.outValues.index = {id: "index", value: this._initialIndex};
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        let {startIndex, endIndex} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        this.outValues.index = {id: "index", value: 0}
        for (let i = Number(startIndex); i < Number(endIndex); i++) {
            this.outValues.index = {id: "index", value: i}
            if (this.flows.loopBody != null) {
                this.processFlow(this.flows.loopBody);
            }

            this.graphEngine.clearValueEvaluationCache();
            const reEvaluatedValues: any = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
            startIndex = reEvaluatedValues.startIndex;
            endIndex = reEvaluatedValues.endIndex;
        }
        this.outValues.index = {id: "index", value: endIndex}
        if (this.flows.completed != null) {
            this.processFlow(this.flows.completed);
        }
    }
}
