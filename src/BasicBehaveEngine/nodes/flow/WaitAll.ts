import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class WaitAll extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "inputFlows"}]

    _lockedFlows: number[];
    _numberInputFlows: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "WaitAll";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {inputFlows} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._numberInputFlows = Number(inputFlows);
        this._lockedFlows = [...Array(this._numberInputFlows).keys()];
        this.outValues.remainingInputs = {id: "remainingInputs", value: [this._lockedFlows.length], type: this.getTypeIndex('int')};
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this)
        if (flowSocket === "reset") {
            this._lockedFlows = [...Array(this._numberInputFlows).keys()];
            this.outValues.remainingInputs = {id: "remainingInputs", value: [this._lockedFlows.length], type: this.getTypeIndex('int')};
            return;
        }

        const flowIndexToRemove = this._lockedFlows.findIndex(flow => flow === Number(flowSocket));
        if (flowIndexToRemove !== -1) {
            this._lockedFlows.splice(flowIndexToRemove, 1);
        }
        this.outValues.remainingInputs = {id: "remainingInputs", value: [this._lockedFlows.length], type: this.getTypeIndex('int')};

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
