import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class Sequence extends BehaveEngineNode {
    _numberOutputFlows: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Sequence";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        this._numberOutputFlows = Object.keys(this.flows).length;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this)

        for (let i = 0; i < Number(this._numberOutputFlows); i++) {
            this.processFlow(this.flows[i]);
        }
    }
}
