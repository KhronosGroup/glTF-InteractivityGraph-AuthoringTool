import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerSet extends BehaveEngineNode {
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

        if (this.isReadOnlyPointer(this._pointer, this._refs, this._indices)) {
            throw new Error(`Path ${this._pointer} is read only but is included in a pointer/interpolate configuration`);
        }
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        const configValues = this.evaluateAllValues(this._refs);
        const configIndices = this.evaluateAllValues(this._indices);
        const requiredValues = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        const populatedPath = this.populatePath(this._pointer, configValues, configIndices);
        const targetValue = requiredValues.value;
        this.graphEngine.processNodeStarted(this);

        if (this.graphEngine.isValidJsonPtr(populatedPath)) {
            const typeName = this.getType(this._typeIndex);
            const type = this.graphEngine.getPathTypeName(populatedPath);
            if (type !== typeName) {
                if (this.flows.err) {
                    this.processFlow(this.flows.err);
                }
                return;
            }
            
            this.graphEngine.clearPointerInterpolation(populatedPath);
            this.graphEngine.setPathValue(populatedPath, targetValue);
            super.processNode(flowSocket);
        } else {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
        }
    }
}
