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

        const {pointer, type} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._pointer = pointer[0];
        this._typeIndex = type[0];

        const valIds = this.parsePathVals(this._pointer);
        const generatedVals: Record<string, IInteractivityValue> = {};
        for (let i = 0; i < valIds.length; i++) {
            generatedVals[valIds[i]] = {value: [undefined], type: 1};
        }
        this._pointerVals = generatedVals;

        const indexIds = this.parsePathIndices(this._pointer);
        const generatedIndices: Record<string, IInteractivityValue> = {};
        for (let i = 0; i < indexIds.length; i++) {
            generatedIndices[indexIds[i]] = {value: [undefined], type: 1};
        }
        this._pointerIndices = generatedIndices;

        this.resolveRef = props.graphEngine.resolveRef;
    }

    parsePathVals(path: string): string[] {
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

    populatePath(path: string, vals: Record<string, any>, indices: Record<string, any>): string {
        let pathCopy = path
        for (const val of Object.keys(vals)) {
            const ref = vals[val];
            const resolvedVal = this.resolveRef(ref);
            pathCopy = pathCopy.replace(`{${val}}`, resolvedVal);
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
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const typeIndex = this.getTypeIndex(typeName!);

            return {
                'value':{value: this.graphEngine.getPathValue(populatedPath), type: typeIndex},
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

