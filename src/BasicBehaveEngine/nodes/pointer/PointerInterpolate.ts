import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerInterpolate extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "pointer"}]
    REQUIRED_VALUES = [{id: "value"}, {id: "duration"}, {id: "p1"}, {id: "p2"}]

    _pointer: string;
    _pointerVals: { id: string }[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PointerInterpolate";
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

        // TODO: abstract this into helper function to remove duplicate code
         //create a test path with all 0's to check if the path is read only 
         const readOnlyTestValues: Record<string, number> = {};
         for (let i = 0; i < valIds.length; i++) {
             readOnlyTestValues[valIds[i]] = 0;
         }
         const readOnlyTestPath = this.populatePath(pointer, readOnlyTestValues);
         const isReadOnly = this.graphEngine.isReadOnly(readOnlyTestPath);
         if (isReadOnly) {
             throw new Error(`Path ${pointer} is read only but is included in a pointer/interpolate configuration`);
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

    override processNode(flowSocket: string) {
        this.graphEngine.clearValueEvaluationCache();
        const configVals = this.evaluateAllValues([...this._pointerVals].map(val => val.id));
        const requiredVals = this.evaluateAllValues([...this.REQUIRED_VALUES].map(val => val.id));
        const populatedPath = this.populatePath(this._pointer, configVals)
        const {p1, p2} = this.evaluateAllValues(["p1", "p2"]);
        const targetValue = requiredVals.value;
        const duration = requiredVals.duration;

        this.graphEngine.processNodeStarted(this);

        if (this.graphEngine.isValidJsonPtr(populatedPath)) {
            const valueType = this.graphEngine.getPathtypeName(populatedPath)!;
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
