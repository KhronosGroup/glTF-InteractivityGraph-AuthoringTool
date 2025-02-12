import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class WaitAll extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {inputFlows: {}}

    _lockedFlows: number[];
    _numberInputFlows: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "WaitAll";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {inputFlows} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._numberInputFlows = Number(inputFlows);
        this._lockedFlows = [...Array(this._numberInputFlows).keys()];
        this.outValues.remainingInputs = { value: [this._lockedFlows.length], type: this.getTypeIndex('int')};
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        this.graphEngine.processNodeStarted(this)
        if (flowSocket === "reset") {
            this._lockedFlows = [...Array(this._numberInputFlows).keys()];
            this.outValues.remainingInputs = { value: [this._lockedFlows.length], type: this.getTypeIndex('int')};
            return;
        }

        const flowIndexToRemove = this._lockedFlows.findIndex(flow => flow === Number(flowSocket));
        if (flowIndexToRemove !== -1) {
            this._lockedFlows.splice(flowIndexToRemove, 1);
        }
        this.outValues.remainingInputs = { value: [this._lockedFlows.length], type: this.getTypeIndex('int')};

        if (this._lockedFlows.length === 0) {
            if (this.flows.completed != null) {
                this.processFlow(this.flows.completed);
            }
        } else {
            if (this.flows.out != null) {
                this.processFlow(this.flows.out);
            }
        }
    }
}
