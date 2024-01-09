import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class Sequence extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "numberOutputFlows"}]
    _numberOutputFlows: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Sequence";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {numberOutputFlows} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._numberOutputFlows = numberOutputFlows;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this)

        for (let i = 0; i < Number(this._numberOutputFlows); i++) {
            this.processFlow(this.flows[i]);
        }
    }
}
