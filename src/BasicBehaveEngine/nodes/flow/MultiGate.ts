import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class MultiGate extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {isRandom: {}, loop: {}}
    _numberOutputFlows: number;
    _currentIndex: number;
    _isRandom: boolean;
    _loop: boolean;
    _unSeenOutFlows: number[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MultiGate";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const { isRandom, loop} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._numberOutputFlows = Object.keys(this.flows).length;
        this._isRandom = JSON.parse(isRandom);
        this._loop = JSON.parse(loop);
        this._unSeenOutFlows = [...Array(this._numberOutputFlows).keys()];
        this._currentIndex = 0;

        this.outValues.lastIndex = { value: [-1], type: this.getTypeIndex('int')};
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);

        if (flowSocket === "reset") {
            this._currentIndex = 0;
            this._unSeenOutFlows = [...Array(this._numberOutputFlows).keys()];
            return;
        }

        if (this._unSeenOutFlows.length === 0) {
            return
        }

        this.outValues.lastIndex = { value: [this._currentIndex], type: this.getTypeIndex('int')};
        this.processFlow(this.flows[this._currentIndex]);
        this._unSeenOutFlows = this._unSeenOutFlows.filter(flow => flow !== this._currentIndex);

        if (this._unSeenOutFlows.length === 0) {
            if (this._loop) {
                this._unSeenOutFlows = [...Array(this._numberOutputFlows).keys()];
            } else {
                return;
            }
        }

        const unSeenFlowIndex = this._isRandom ? Math.floor(Math.random() * this._unSeenOutFlows.length) : 0;
        this._currentIndex = this._unSeenOutFlows[unSeenFlowIndex];
    }
}
