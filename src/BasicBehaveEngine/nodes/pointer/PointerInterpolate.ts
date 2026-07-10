import { IInteractivityValue } from "../../types/InteractivityGraph";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerInterpolate extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {pointer: {}, type: {}}
    REQUIRED_VALUES = {value: {}, duration: {}, p1: {}, p2: {}}

   _pointer: string;
    _pointerVals: Record<string, IInteractivityValue>;
    _pointerIndices: Record<string, IInteractivityValue>;
    _typeIndex: number;
    
    resolveRef: (ref: any) => any;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PointerInterpolate";
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

        // TODO: abstract this into helper function to remove duplicate code
        //create a test path with all 0's to check if the path is read only 
        const readOnlyTestRefs: Record<string, number> = {};
        for (let i = 0; i < refIds.length; i++) {
            readOnlyTestRefs[refIds[i]] = 0;
        }
        const readOnlyTestIndices: Record<string, number> = {};
        for (let i = 0; i < indexIds.length; i++) {
            readOnlyTestIndices[indexIds[i]] = 0;
        }
        const readOnlyTestPath = this.populatePath(this._pointer, readOnlyTestRefs, readOnlyTestIndices);
        const isReadOnly = this.graphEngine.isReadOnly(readOnlyTestPath);
        if (isReadOnly) {
            throw new Error(`Path ${this._pointer} is read only but is included in a pointer/interpolate configuration`);
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

    override processNode(flowSocket: string) {
        this.graphEngine.clearValueEvaluationCache();
        const configVals = this.evaluateAllValues(Object.keys(this._pointerVals));
        const configIndices = this.evaluateAllValues(Object.keys(this._pointerIndices));
        const requiredVals = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        const populatedPath = this.populatePath(this._pointer, configVals, configIndices);
        const {p1, p2} = this.evaluateAllValues(["p1", "p2"]);
        const targetValue = requiredVals.value;
        const duration = requiredVals.duration;

        this.graphEngine.processNodeStarted(this);

        if (this.graphEngine.isValidJsonPtr(populatedPath)) {
            const valueType = this.graphEngine.getPathtypeName(populatedPath)!;
            const typeName = this.getType(this._typeIndex);
            if (valueType !== typeName) {
                if (this.flows.err) {
                    this.processFlow(this.flows.err);
                }
                return;
            }

            if (!isValidInterpolationInput(duration, p1, p2)) {
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
        } else {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
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
