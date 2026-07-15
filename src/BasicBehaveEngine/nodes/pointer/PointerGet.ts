import { IInteractivityValue } from "../../types/InteractivityGraph";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerGet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {pointer: {}, type: {}}

    _pointer: string;
    _pointerVals: Record<string, IInteractivityValue>;
    _pointerIndices: Record<string, IInteractivityValue>;
    _typeIndex: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PointerGet";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {pointer, type} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._pointer = pointer[0];
        this._typeIndex = type[0];

        this._pointerVals = {};
        const refIds = this.parsePathRefVariables(this._pointer);
        for (let i = 0; i < refIds.length; i++) {
            this._pointerVals[refIds[i]] = {value: [undefined], type: 1};
        }

        this._pointerIndices = {};
        const indexIds = this.parsePathIndexVariables(this._pointer);
        for (let i = 0; i < indexIds.length; i++) {
            this._pointerIndices[indexIds[i]] = {value: [undefined], type: 1};
        }
    }

    override processNode(flowSocket?: string) {
        const configValues = this.evaluateAllValues(Object.keys(this._pointerVals));
        const configIndices = this.evaluateAllValues(Object.keys(this._pointerIndices));
        const populatedPath = this.populatePath(this._pointer, configValues, configIndices);
        this.graphEngine.processNodeStarted(this);

        if (this.graphEngine.isValidJsonPtr(populatedPath)) {
            const typeName = this.graphEngine.getPathtypeName(populatedPath);
            const configuredTypeName = this.getType(this._typeIndex);

            if (typeName !== configuredTypeName) {
                return {
                    'value':{value: this.getDefaultValueForType(configuredTypeName), type: this._typeIndex},
                    'isValid':{value: [false], type: this.getTypeIndex('bool')}
                };
            }

            return {
                'value':{value: this.graphEngine.getPathValue(populatedPath), type: this._typeIndex},
                'isValid':{value: [true], type: this.getTypeIndex('bool')}
            };
        } else {
            const typeName = this.getType(this._typeIndex);
            return {
                'value':{value: this.getDefaultValueForType(typeName), type: this._typeIndex},
                'isValid':{value: [false], type: this.getTypeIndex('bool')}
            };
        }
    }
}
