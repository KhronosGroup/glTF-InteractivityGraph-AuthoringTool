import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class MultiGate extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "numberOutputFlows"}, {id: "isRandom"}, {id: "loop"}, {id: "startIndex"}]
    _numberOutputFlows: number;
    _startIndex: number;
    _currentIndex: number;
    _isRandom: boolean;
    _loop: boolean;
    _unSeenOutFlows: number[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MultiGate";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {numberOutputFlows, startIndex, isRandom, loop} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._numberOutputFlows = Number(numberOutputFlows);
        this._startIndex = Number(startIndex);
        this._currentIndex = Number(startIndex);
        this._isRandom = JSON.parse(isRandom);
        this._loop = JSON.parse(loop);
        this._unSeenOutFlows = [...Array(this._numberOutputFlows).keys()];
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);

        if (flowSocket === "reset") {
            this._currentIndex = this._startIndex;
            this._unSeenOutFlows = [...Array(this._numberOutputFlows).keys()];
            return;
        }

        if (this._unSeenOutFlows.length === 0) {
            return
        }

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
