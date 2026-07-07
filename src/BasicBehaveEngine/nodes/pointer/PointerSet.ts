import { IInteractivityValue } from "../../types/InteractivityGraph";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerSet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {pointer: {}, type: {}}
    REQUIRED_VALUES = {value: {}}

    _pointer: string;
    _pointerVals: Record<string, IInteractivityValue>;
    _pointerIndices: Record<string, IInteractivityValue>;
    _typeIndex: number;

    resolveRef: (ref: any) => any;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PointerSet";
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
        this.graphEngine.clearValueEvaluationCache();
        const configValues = this.evaluateAllValues(Object.keys(this._pointerVals));
        const configIndices = this.evaluateAllValues(Object.keys(this._pointerIndices));
        const requiredValues = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        const populatedPath = this.populatePath(this._pointer, configValues, configIndices);
        const targetValue = requiredValues.value;
        this.graphEngine.processNodeStarted(this);

        if (this.graphEngine.isValidJsonPtr(populatedPath)) {
            const typeName = this.getType(this._typeIndex);
            const type = this.graphEngine.getPathtypeName(populatedPath);
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
