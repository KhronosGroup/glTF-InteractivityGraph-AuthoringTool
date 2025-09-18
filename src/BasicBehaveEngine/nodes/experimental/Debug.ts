
import { IInteractivityValue } from "../../types/InteractivityGraph";
import { standardTypes } from "../../types/nodes";
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class DebugLog extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {message: {defaultValue: [""]}, severity: {defaultValue: [0]}}

    _message: string;
    _severity: number;
    _templateValues: Record<string, IInteractivityValue>;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "DebugLog";
        this.validateConfigurations(this.configuration);
        const {message, severity} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._message = message[0];
        this._severity = Number(severity[0]);

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
            const typeName = this.getType(this.values[val].type!);
            templateCopy = templateCopy.replace(`{${val}}`, formatValue(vals[val], typeName));
        }
        return templateCopy;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();

        const templateValues = this.evaluateAllValues(Object.keys(this._templateValues));
        const populatedTemplate = this.populateTemplate(this._message, templateValues);

        this.graphEngine.processNodeStarted(this);

        if (this._severity === 0) {
            console.log(populatedTemplate);
        } else if (this._severity === 1) {
            console.warn(populatedTemplate);
        } else if (this._severity === 2) {
            console.error(populatedTemplate);
        }

        super.processNode(flowSocket);
    }
}

function formatValue(value: any, typeName: string): string {
    switch (typeName) {
        case "bool":
        case "int":
        case "float":
            return value.toString();
        case "float2":
            return `[${value[0]}, ${value[1]}]`;
        case "float3":
            return `[${value[0]}, ${value[1]}, ${value[2]}]`;
        case "float4":
            return `[${value[0]}, ${value[1]}, ${value[2]}, ${value[3]}]`;
        case "float2x2":
            return `[
                [${value[0][0]}, ${value[0][1]}],
                [${value[1][0]}, ${value[1][1]}]
            ]`;
        case "float3x3":
            return `[
                [${value[0][0]}, ${value[0][1]}, ${value[0][2]}],
                [${value[1][0]}, ${value[1][1]}, ${value[1][2]}],
                [${value[2][0]}, ${value[2][1]}, ${value[2][2]}]
            ]`;
        case "float4x4":
            return `[
                [${value[0][0]}, ${value[0][1]}, ${value[0][2]}, ${value[0][3]}],
                [${value[1][0]}, ${value[1][1]}, ${value[1][2]}, ${value[1][3]}],
                [${value[2][0]}, ${value[2][1]}, ${value[2][2]}, ${value[2][3]}],
                [${value[3][0]}, ${value[3][1]}, ${value[3][2]}, ${value[3][3]}]
            ]`;
        default:
            return value.toString();
    }
}