import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class WorldGet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "path"}]

    _path: string;
    _pathVals: { id: string }[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "WorldGet";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {path} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._path = path;
        const valIds = this.parsePath(path);
        const generatedParams = [];
        for (let i = 0; i < valIds.length; i++) {
            generatedParams.push({id: valIds[i]});
        }
        this._pathVals = generatedParams;
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
        const vals = this.evaluateAllValues([...this._pathVals].map(val => val.id));
        const populatedPath = this.populatePath(this._path, vals)
        this.graphEngine.processNodeStarted(this);

        let outVal: any;
        if (this.graphEngine.isValidJsonPtr(populatedPath)) {
            outVal = this.graphEngine.getPathValue(populatedPath);
        } else {
            outVal = undefined
        }

        const typeName = this.graphEngine.getPathtypeName(populatedPath);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const typeIndex = this.getTypeIndex(typeName!);

        return {id: "val", value: outVal, type: typeIndex}
    }
}

