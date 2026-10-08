import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerSet extends BehaveEngineNode {
    INPUT_FLOWS = ["in"];
    REQUIRED_CONFIGURATIONS = {pointer: {}, type: {}}
    REQUIRED_VALUES = {value: {}}

    _pointer: string;
    _refs: string[];
    _indices: string[];
    _typeIndex: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PointerSet";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {pointer, type} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._pointer = pointer[0];
        this._typeIndex = type[0];

        this._refs = this.parsePathRefVariables(this._pointer);
        this._indices = this.parsePathIndexVariables(this._pointer);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        const configValues = this.evaluateAllValues(this._refs);
        const configIndices = this.evaluateAllValues(this._indices);
        const requiredValues = this.evaluateRequiredValues();
        const targetValue = requiredValues.value;
        this.graphEngine.processNodeStarted(this);

        const pointer = this.resolveWritablePointer(this._pointer, configValues, configIndices, this.getType(this._typeIndex));
        if (pointer === undefined) {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
            return;
        }

        this.graphEngine.clearPointerInterpolation(pointer.path);
        pointer.entry.setValue(pointer.path, targetValue);
        super.processNode(flowSocket);
    }
}
