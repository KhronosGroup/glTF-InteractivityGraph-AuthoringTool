import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class ForLoop extends BehaveEngineNode {
    INPUT_FLOWS = ["in"];
    REQUIRED_CONFIGURATIONS = {initialIndex: {defaultValue: [0]}};
    REQUIRED_VALUES = {startIndex: {}, endIndex: {}};

    _initialIndex: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ForLoop";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {initialIndex} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        // spec: initialIndex must be an int32, otherwise the default configuration (0) is used
        const init = initialIndex?.[0];
        this._initialIndex = init === (init | 0) ? init : 0;
        this.outValues.index = { value: [this._initialIndex], type: this.getTypeIndex('int')};
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        const {startIndex} = this.evaluateAllValues(["startIndex"]);
        this.graphEngine.processNodeStarted(this);
        // spec: index = startIndex, then re-evaluate endIndex before each iteration; index is never forced to endIndex
        let index = Number(startIndex);
        const intType = this.getTypeIndex('int');
        this.outValues.index = { value: [index], type: intType}
        const evaluateEndIndex = () => {
            this.graphEngine.clearValueEvaluationCache();
            return Number(this.evaluateAllValues(["endIndex"]).endIndex);
        };
        while (index < evaluateEndIndex()) {
            if (this.flows.loopBody != null) {
                this.processFlow(this.flows.loopBody);
            }
            index++;
            this.outValues.index = { value: [index], type: intType}
        }
        if (this.flows.completed != null) {
            this.processFlow(this.flows.completed);
        }
    }
}
