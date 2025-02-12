import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class DoN extends BehaveEngineNode {
    REQUIRED_VALUES = {n: {}};

    _currentCount: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "DoN";
        this.validateValues(this.values);

        this._currentCount = 0;
        this.outValues.currentCount = { value: [this._currentCount], type: this.getTypeIndex('int')};
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        const {n} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);

        if (flowSocket === "reset") {
            this._currentCount = 0;
            this.outValues.currentCount = { value: [this._currentCount], type: this.getTypeIndex('int')};
            return;
        }
        if (this._currentCount >= Number(n)) {
            return;
        }

        this._currentCount++;
        this.outValues.currentCount = { value: [this._currentCount], type: this.getTypeIndex('int')};
        super.processNode(flowSocket);
    }
}
