import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OutputConsole extends BehaveEngineNode {
    REQUIRED_VALUES = {message: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "OutputConsole";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();

        const {message} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));

        this.graphEngine.processNodeStarted(this);

        console.log(`ADBE/outputConsole: ${message}`);
        super.processNode(flowSocket);
    }
}
