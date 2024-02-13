import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OutputConsole extends BehaveEngineNode {
    REQUIRED_VALUES = [{id: "message"}]

    _message: string;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "OutputConsole";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {message} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));

        this._message = message;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();

        const {message} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        this._message = message;

        this.graphEngine.processNodeStarted(this);

        console.log(`ADBE/outputConsole: ${message}`);
        super.processNode(flowSocket);
    }
}