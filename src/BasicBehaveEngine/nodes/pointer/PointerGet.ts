import { IInteractivityValue } from "../../types/InteractivityGraph";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerGet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {pointer: {}, type: {}}

    _pointer: string;
    _pointerVals: Record<string, IInteractivityValue>;
    _pointerIndices: Record<string, IInteractivityValue>;
    _typeIndex: number;

    resolveRef: (ref: any) => any;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PointerGet";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);
        this.resolveRef = props.graphEngine.resolveRef;

        const {pointer, type} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._pointer = pointer[0];
        this._typeIndex = type[0];

        this._pointerVals = {};
        const refIds = this.parsePathRefs(this._pointer);
        for (let i = 0; i < refIds.length; i++) {
            this._pointerVals[refIds[i]] = {value: [undefined], type: 1};
        }

        this._pointerIndices = {};
        const indexIds = this.parsePathIndices(this._pointer);
        for (let i = 0; i < indexIds.length; i++) {
            this._pointerIndices[indexIds[i]] = {value: [undefined], type: 1};
        }
    }

    parsePathRefs(path: string): string[] {
        const regex = /{([^}]+)}/g;
        const match = path.match(regex);
        const keys: string[] = [];

        if (!match) {
            return keys;
        }

        for (const m of match) {
            const key = m.slice(1, -1); // remove the curly braces from the match
            keys.push(key)
        }

        return keys;
    }

    parsePathIndices(path: string): string[] {
        const regex = /\[([^\]]+)\]/g;
        const match = path.match(regex);
        const keys: string[] = [];

        if (!match) {
            return keys;
        }

        for (const m of match) {
            const key = m.slice(1, -1); // remove the square brackets from the match
            keys.push(key)
        }

        return keys;
    }

    populatePath(path: string, refs: Record<string, any>, indices: Record<string, any>): string {
        let pathCopy = path
        for (const ref of Object.keys(refs)) {
            const refValue = refs[ref];

            // is refValue is a string and of format /materials/3, extract the last part after the last slash
            if (typeof refValue === "string" && refValue.includes("/")) {
                const parts = refValue.split("/").filter(part => part !== "");
                const lastPart = parts[parts.length - 1];
                pathCopy = pathCopy.replace(`{${ref}}`, lastPart);
            }
            else {
                const resolvedVal = this.resolveRef(refValue);
                pathCopy = pathCopy.replace(`{${ref}}`, resolvedVal);
            }
        }
        for (const index of Object.keys(indices)) {
            pathCopy = pathCopy.replace(`[${index}]`, indices[index]);
        }
        return pathCopy;
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

            if (typeName === "ref") {
                return {
                    'value':{value: [populatedPath], type: this._typeIndex},
                    'isValid':{value: [true], type: this.getTypeIndex('bool')}
                };
            }

            return {
                'value':{value: this.getDefaultValueForType(typeName), type: this._typeIndex},
                'isValid':{value: [false], type: this.getTypeIndex('bool')}
            };
        }
    }
}
