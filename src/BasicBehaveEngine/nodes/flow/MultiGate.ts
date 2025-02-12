import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class MultiGate extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {isRandom: {}, loop: {}}
    _numberOutputFlows: number;
    _currentIndex: number;
    _isRandom: boolean;
    _loop: boolean;
    _orderedOutFlows: string[];
    _unSeenOutIndexes: number[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MultiGate";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const { isRandom, loop} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._numberOutputFlows = Object.keys(this.flows).length;
        this._isRandom = JSON.parse(isRandom);
        this._loop = JSON.parse(loop);
        this._orderedOutFlows =  Object.keys(this.flows).sort();
        this._unSeenOutIndexes = Array(this._numberOutputFlows).fill(0).map((_, index) => index);
        this._currentIndex = 0;

        this.outValues.lastIndex = { value: [-1], type: this.getTypeIndex('int')};
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        this.graphEngine.processNodeStarted(this);

        if (flowSocket === "reset") {
            this._currentIndex = 0;
            this._unSeenOutIndexes = Array(this._numberOutputFlows).fill(0).map((_, index) => index);
            return;
        }

        if (this._unSeenOutIndexes.length === 0) {
            return
        }

        const currentFlowName = this._orderedOutFlows[this._unSeenOutIndexes[this._currentIndex]];

        this.outValues.lastIndex = { value: [this._unSeenOutIndexes[this._currentIndex]], type: this.getTypeIndex('int')};
        this.processFlow(this.flows[currentFlowName]);

        if (this._unSeenOutIndexes.length === 0) {
            if (this._loop) {
                this._unSeenOutIndexes = Array(this._numberOutputFlows).fill(0).map((_, index) => index);
            } else {
                return;
            }
        }

        this._unSeenOutIndexes.splice(this._currentIndex, 1);
        if (this._isRandom) {
            this._currentIndex = this._unSeenOutIndexes[Math.floor(Math.random() * this._unSeenOutIndexes.length)];
        } else {
            this._currentIndex = (this._currentIndex) % this._unSeenOutIndexes.length;
        }
    }
}
