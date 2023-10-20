import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class DoN extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"n"}];
    REQUIRED_CONFIGURATIONS = [{id: "startCount"}];

    _currentCount: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "DoN";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {startCount} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._currentCount = startCount
    }

    override processNode(flowSocket?: string) {
        const {n} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this.graphEngine.processNodeStarted(this);

        if (flowSocket === "reset") {
            this._currentCount = 0;
            return;
        }
        if (this._currentCount >= Number(n)) {
            return;
        }

        this._currentCount++;
        super.processNode(flowSocket);
    }
}
