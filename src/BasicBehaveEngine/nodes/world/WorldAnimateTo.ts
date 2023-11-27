import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class WorldAnimateTo extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "path"}, {id: "easingType"}]
    REQUIRED_VALUES = [{id: "a"}, {id: "easingDuration"}]

    _path: string;
    _easingType: number;
    _pathVals: { id: string }[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "WorldAnimateTo";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {path, easingType} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._easingType = easingType;
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

    override processNode(flowSocket: string) {
        this.graphEngine.clearValueEvaluationCache();
        const configVals = this.evaluateAllValues([...this._pathVals].map(val => val.id));
        const requiredVals = this.evaluateAllValues([...this.REQUIRED_VALUES].map(val => val.id));
        const populatedPath = this.populatePath(this._path, configVals)
        const targetValue = requiredVals.a;
        const easingDuration = requiredVals.easingDuration;

        this.graphEngine.processNodeStarted(this);

        if (this.graphEngine.isValidJsonPtr(populatedPath)) {
            const initialValue = this.graphEngine.getPathValue(populatedPath);
            const type = this.graphEngine.getPathtypeName(populatedPath)!;
            this.graphEngine.animateProperty(type, populatedPath, this._easingType, easingDuration, initialValue, targetValue, () => {
                if (this.flows.done) {
                    this.addEventToWorkQueue(this.flows.done)
                }
            });
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
