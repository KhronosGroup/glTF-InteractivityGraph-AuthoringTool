import { IInteractivityValue } from "../../../types/InteractivityGraph";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerSet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {pointer: {}, type: {}}
    REQUIRED_VALUES = {value: {}}

    _pointer: string;
    _pointerVals: Record<string, IInteractivityValue>;
    _typeIndex: number;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PointerSet";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {pointer, type} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._pointer = pointer[0];
        this._typeIndex = type[0];
        const valIds = this.parsePath(this._pointer);
        const generatedVals: Record<string, IInteractivityValue> = {};
        for (let i = 0; i < valIds.length; i++) {
            generatedVals[valIds[i]] = {value: [undefined], type: 1};
        }

        //create a test path with all 0's to check if the path is read only
        const readOnlyTestValues: Record<string, number> = {};
        for (let i = 0; i < valIds.length; i++) {
            readOnlyTestValues[valIds[i]] = 0;
        }
        const readOnlyTestPath = this.populatePath(this._pointer, readOnlyTestValues);
        const isReadOnly = this.graphEngine.isReadOnly(readOnlyTestPath);
        if (isReadOnly) {
            throw new Error(`Path ${this._pointer} is read only but is included in a pointer/set configuration`);
        }
        
        this._pointerVals = generatedVals;
    }

    parsePath(path: string): string[] {
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

    populatePath(path: string, vals: any): string {
        let pathCopy = path
        for (const val of Object.keys(vals)) {
            pathCopy = pathCopy.replace(`{${val}}`, vals[val]);
        }
        return pathCopy;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();
        const configValues = this.evaluateAllValues(Object.keys(this._pointerVals));
        const requiredValues = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        const populatedPath = this.populatePath(this._pointer, configValues)
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
