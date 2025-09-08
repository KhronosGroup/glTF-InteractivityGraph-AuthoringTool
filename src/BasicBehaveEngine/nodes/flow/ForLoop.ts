import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class ForLoop extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {initialIndex: {defaultValue: [0]}};
    REQUIRED_VALUES = {startIndex: {}, endIndex: {}};

    _initialIndex: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ForLoop";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {initialIndex} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._initialIndex = initialIndex[0];
        this.outValues.index = { value: [this._initialIndex], type: this.getTypeIndex('int')};
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        let {startIndex, endIndex} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        this.outValues.index = { value: [0], type: this.getTypeIndex('int')}
        for (let i = Number(startIndex); i < Number(endIndex); i++) {
            this.outValues.index = { value: [i], type: this.getTypeIndex('int')}
            if (this.flows.loopBody != null) {
                this.processFlow(this.flows.loopBody);
            }

            this.graphEngine.clearValueEvaluationCache();
            const reEvaluatedValues: any = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
            startIndex = reEvaluatedValues.startIndex;
            endIndex = reEvaluatedValues.endIndex;
        }
        this.outValues.index = { value: [endIndex], type: this.getTypeIndex('int')}
        if (this.flows.completed != null) {
            this.processFlow(this.flows.completed);
        }
    }
}
