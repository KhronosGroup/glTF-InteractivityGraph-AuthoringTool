import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerSet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "pointer"}]
    REQUIRED_VALUES = [{id: "value"}]

    _pointer: string;
    _pointerVals: { id: string }[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PointerSet";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {pointer} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._pointer = pointer;
        const valIds = this.parsePath(pointer);
        const generatedVals = [];
        for (let i = 0; i < valIds.length; i++) {
            generatedVals.push({id: valIds[i]});
        }

        //create a test path with all 0's to check if the path is read only
        const readOnlyTestValues: Record<string, number> = {};
        for (let i = 0; i < valIds.length; i++) {
            readOnlyTestValues[valIds[i]] = 0;
        }
        const readOnlyTestPath = this.populatePath(pointer, readOnlyTestValues);
        const isReadOnly = this.graphEngine.isReadOnly(readOnlyTestPath);
        if (isReadOnly) {
            throw new Error(`Path ${pointer} is read only but is included in a pointer/set configuration`);
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
        const configValues = this.evaluateAllValues([...this._pointerVals].map(val => val.id));
        const requiredValues = this.evaluateAllValues([...this.REQUIRED_VALUES].map(val => val.id));
        const populatedPath = this.populatePath(this._pointer, configValues)
        const targetValue = requiredValues.value;
        this.graphEngine.processNodeStarted(this);

        if (this.graphEngine.isValidJsonPtr(populatedPath)) {
            this.graphEngine.getWorldAnimationPathCallback(this._pointer)?.cancel();
            this.graphEngine.setPathValue(populatedPath, targetValue);
            super.processNode(flowSocket);
        } else {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
        }
    }
}
