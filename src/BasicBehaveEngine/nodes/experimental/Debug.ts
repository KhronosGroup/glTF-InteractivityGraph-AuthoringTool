
import { IInteractivityValue } from "../../../types/InteractivityGraph";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class DebugLog extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {message: {defaultValue: [""]}}

    _message: string;
    _templateValues: Record<string, IInteractivityValue>;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "DebugLog";
        this.validateConfigurations(this.configuration);
        const {message} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._message = message[0];

        const valIds = this.parseTemplate(this._message);
        const generatedVals: Record<string, IInteractivityValue> = {};
        for (let i = 0; i < valIds.length; i++) {
            generatedVals[valIds[i]] = {value: [undefined], type: 1};
        }
        this._templateValues = generatedVals;
    }

    parseTemplate(path: string): string[] {
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

    populateTemplate(template: string, vals: any): string {
        let templateCopy = template
        for (const val of Object.keys(vals)) {
            templateCopy = templateCopy.replace(`{${val}}`, vals[val]);
        }
        return templateCopy;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();

        const templateValues = this.evaluateAllValues(Object.keys(this._templateValues));
        const populatedTemplate = this.populateTemplate(this._message, templateValues);

        this.graphEngine.processNodeStarted(this);

        console.log(populatedTemplate);

        super.processNode(flowSocket);
    }
}
