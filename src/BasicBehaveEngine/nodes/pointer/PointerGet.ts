import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerGet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {pointer: {}, type: {}}

    _pointer: string;
    _refs: string[];
    _indices: string[];
    _typeIndex: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PointerGet";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {pointer, type} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._pointer = pointer[0];
        this._typeIndex = type[0];

        this._refs = this.parsePathRefVariables(this._pointer);
        this._indices = this.parsePathIndexVariables(this._pointer);
    }

    override processNode(flowSocket?: string) {
        const configValues = this.evaluateAllValues(this._refs);
        const configIndices = this.evaluateAllValues(this._indices);
        const populatedPath = this.populatePath(this._pointer, configValues, configIndices);
        this.graphEngine.processNodeStarted(this);

        if (this.graphEngine.isValidJsonPtr(populatedPath)) {
            const typeName = this.graphEngine.getPathTypeName(populatedPath);
            const configuredTypeName = this.getType(this._typeIndex);

            if (typeName !== configuredTypeName) {
                return {
                    'value': {value: this.getDefaultValueForType(configuredTypeName), type: this._typeIndex},
                    'isValid': {value: [false], type: this.getTypeIndex('bool')}
                };
            }

            const value = this.graphEngine.getPathValue(populatedPath);
            if (value !== undefined) {
                return {
                    'value': {value, type: this._typeIndex},
                    'isValid': {value: [true], type: this.getTypeIndex('bool')}
                };
            } else {
                return {
                    'value': {value: this.getDefaultValueForType(configuredTypeName), type: this._typeIndex},
                    'isValid': {value: [false], type: this.getTypeIndex('bool')}
                };
            }
        } else {
            const typeName = this.getType(this._typeIndex);
            return {
                'value': {value: this.getDefaultValueForType(typeName), type: this._typeIndex},
                'isValid': {value: [false], type: this.getTypeIndex('bool')}
            };
        }
    }
}
