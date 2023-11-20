import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class WorldSet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "path"}]
    REQUIRED_VALUES = [{id: "a"}]

    _path: string;
    _pathVals: { id: string }[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "WorldSet";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {path} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._path = path;
        const valIds = this.parsePath(path);
        const generatedVals = [];
        for (let i = 0; i < valIds.length; i++) {
            generatedVals.push({id: valIds[i]});
        }
        this._pathVals = generatedVals;
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
        const configValues = this.evaluateAllValues([...this._pathVals].map(val => val.id));
        const requiredValues = this.evaluateAllValues([...this.REQUIRED_VALUES].map(val => val.id));
        const populatedPath = this.populatePath(this._path, configValues)
        const targetValue = requiredValues.a;
        this.graphEngine.processNodeStarted(this);

        if (this.graphEngine.isValidJsonPtr(populatedPath)) {
            this.graphEngine.getWorldAnimationPathCallback(this._path)?.cancel();
            this.graphEngine.setPathValue(populatedPath, targetValue);
            super.processNode(flowSocket);
        }
    }
}
