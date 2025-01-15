import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class PointerAnimateTo extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "pointer"}, {id: "easingType"}]
    REQUIRED_VALUES = [{id: "value"}, {id: "easingDuration"}]

    _pointer: string;
    _easingType: number;
    _pointerVals: { id: string }[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "PointerAnimateTo";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {pointer, easingType} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._easingType = easingType;
        this._pointer = pointer;
        const valIds = this.parsePath(pointer);
        const generatedVals = [];
        for (let i = 0; i < valIds.length; i++) {
            generatedVals.push({id: valIds[i]});
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
        const targetValue = requiredVals.value;
        const easingDuration = requiredVals.easingDuration;

        const easingParameters: any = {
            easingType: this._easingType,
            easingDuration: easingDuration,
            targetValue: targetValue
        };
        if (this._easingType === 0) {
            //CUBIC BEZIER
            const {cp1, cp2} = this.evaluateAllValues(["cp1", "cp2"]);
            easingParameters["cp1"] = cp1;
            easingParameters["cp2"] = cp2;
        }

        this.graphEngine.processNodeStarted(this);

        if (this.graphEngine.isValidJsonPtr(populatedPath)) {
            easingParameters.valueType = this.graphEngine.getPathtypeName(populatedPath)!;
            easingParameters.initialValue = this.graphEngine.getPathValue(populatedPath);
            console.log(populatedPath, easingParameters);

            this.graphEngine.animateProperty(populatedPath, easingParameters, () => {
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
