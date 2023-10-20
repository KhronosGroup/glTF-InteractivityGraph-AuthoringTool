import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class WaitAll extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "numberInputFlows"}]

    _lockedFlows: number[];
    _numberInputFlows: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "WaitAll";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {numberInputFlows} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._numberInputFlows = Number(numberInputFlows);
        this._lockedFlows = [...Array(this._numberInputFlows).keys()];
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this)
        if (flowSocket === "reset") {
            this._lockedFlows = [...Array(this._numberInputFlows).keys()];
            return;
        }

        const flowIndexToRemove = this._lockedFlows.findIndex(flow => flow === Number(flowSocket));
        if (flowIndexToRemove !== -1) {
            this._lockedFlows.splice(flowIndexToRemove, 1);
        }

        if (this._lockedFlows.length === 0) {
            super.processNode(flowSocket);
        }
    }
}
