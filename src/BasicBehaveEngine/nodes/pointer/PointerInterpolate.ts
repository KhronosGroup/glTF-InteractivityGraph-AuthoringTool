import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerInterpolate extends BehaveEngineNode {
    INPUT_FLOWS = ["in"];
    REQUIRED_CONFIGURATIONS = {pointer: {}, type: {}}
    REQUIRED_VALUES = {value: {}, duration: {}, p1: {}, p2: {}}

    _pointer: string;
    _refs: string[];
    _indices: string[];
    _typeIndex: number;
    
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PointerInterpolate";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {pointer, type} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._pointer = pointer[0];
        this._typeIndex = type[0];

        this._refs = this.parsePathRefVariables(this._pointer);
        this._indices = this.parsePathIndexVariables(this._pointer);
    }

    override processNode(flowSocket: string) {
        this.graphEngine.clearValueEvaluationCache();
        const configVals = this.evaluateAllValues(this._refs);
        const configIndices = this.evaluateAllValues(this._indices);
        const requiredVals = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        const {p1, p2} = this.evaluateAllValues(["p1", "p2"]);
        const targetValue = requiredVals.value;
        const duration = requiredVals.duration;

        this.graphEngine.processNodeStarted(this);

        const valueType = this.getType(this._typeIndex);
        const populatedPath = this.resolveWritablePointer(this._pointer, configVals, configIndices, valueType);
        if (populatedPath === undefined || !isValidInterpolationInput(duration, p1, p2)) {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
            return;
        }

        const initialValue = this.graphEngine.getPathValue(populatedPath);

        this.graphEngine.animateCubicBezier(populatedPath, p1, p2, initialValue, targetValue, duration, valueType, () => {
            if (this.flows.done) {
                this.addEventToWorkQueue(this.flows.done)
            }
        })

        if (this.flows.out) {
            this.processFlow(this.flows.out);
        }
    }
}

function isValidInterpolationInput(duration: any, p1: any[], p2: any[]): boolean {
    const durationValue = Number(duration);
    if (Number.isNaN(durationValue) || !Number.isFinite(durationValue) || durationValue < 0) {
        return false;
    }

    return [p1, p2].every((point) => {
        if (!Array.isArray(point) || point.length < 2) {
            return false;
        }
        const x = Number(point[0]);
        const y = Number(point[1]);
        return Number.isFinite(x)
            && Number.isFinite(y)
            && x >= 0
            && x <= 1;
    });
}
