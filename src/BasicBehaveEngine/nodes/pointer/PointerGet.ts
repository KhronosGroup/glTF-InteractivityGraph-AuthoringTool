import { IInteractivityValue } from "../../types/InteractivityGraph";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerGet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {pointer: {}, type: {}}

    _pointer: string;
    _pointerVals: Record<string, IInteractivityValue>;
    _typeIndex: number;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PointerGet";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {pointer, type} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._pointer = pointer[0];
        this._typeIndex = type;
        const valIds = this.parsePath(this._pointer);
        const generatedParams: Record<string, IInteractivityValue> = {};
        for (let i = 0; i < valIds.length; i++) {
            generatedParams[valIds[i]] = {value: [undefined], type: 1};
        }
        this._pointerVals = generatedParams;
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
        const vals = this.evaluateAllValues(Object.keys(this._pointerVals));
        const populatedPath = this.populatePath(this._pointer, vals)
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
                'value':{value: this.getDefualtValueForType(typeName), type: this._typeIndex},
                'isValid':{value: [false], type: this.getTypeIndex('bool')}
            };
        }
    }
}

