
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";
import {MessageTemplateParameter, parseMessageTemplate, populateMessageTemplate} from "../../messageTemplate";

export class DebugLog extends BehaveEngineNode {
    INPUT_FLOWS = ["in"];
    REQUIRED_CONFIGURATIONS = {message: {defaultValue: [""]}, severity: {defaultValue: [0]}}

    _message: string;
    _severity: number;
    _parameters: MessageTemplateParameter[];
    _socketIds: string[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "DebugLog";
        this.validateConfigurations(this.configuration);
        const {message, severity} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        const parameters = typeof message?.[0] === "string" ? parseMessageTemplate(message[0]) : undefined;
        const severityValue = severity?.[0];
        // spec: a non-string/invalid message or a non-int32 severity selects the default configuration
        if (parameters === undefined || typeof severityValue !== "number" || severityValue !== (severityValue | 0)) {
            this._message = "";
            this._severity = 0;
            this._parameters = [];
        } else {
            this._message = message[0];
            this._severity = severityValue;
            this._parameters = parameters;
        }
        this._socketIds = [...new Set(this._parameters.map(parameter => parameter.id))];

        // spec: a node missing a template parameter socket is invalid and the graph must be rejected
        const missing = this._socketIds.filter(id => this.values[id] === undefined);
        if (missing.length > 0) {
            throw new Error(`debug/log node ${this.index} is missing input value socket(s) ${missing.map(id => `"${id}"`).join(", ")} required by its message template`);
        }
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();

        // spec: all input values are evaluated, including extra sockets not used by the template
        const values = this.evaluateAllValues(Object.keys(this.values));
        const populatedTemplate = populateMessageTemplate(this._message, this._parameters,
            id => formatValue(values[id], this.getType(this.values[id].type!)));

        this.graphEngine.processNodeStarted(this);

        if (this._severity === 0) {
            console.log(`[DebugLog #${this.index}]`, populatedTemplate);
        } else if (this._severity === 1) {
            console.warn(`[DebugLog #${this.index}]`, populatedTemplate);
        } else if (this._severity === 2) {
            console.error(`[DebugLog #${this.index}]`, populatedTemplate);
        }

        super.processNode(flowSocket);
    }
}

function formatValue(value: any, typeName: string): string {
    if (value === null) {
        return "null";
    }
    if (value === undefined) {
        return "undefined";
    }

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
                [${value[0]}, ${value[1]}],
                [${value[2]}, ${value[3]}]
            ]`;
        case "float3x3":
            return `[
                [${value[0]}, ${value[1]}, ${value[2]}],
                [${value[3]}, ${value[4]}, ${value[5]}],
                [${value[6]}, ${value[7]}, ${value[8]}]
            ]`;
        case "float4x4":
            return `[
                [${value[0]}, ${value[1]}, ${value[2]}, ${value[3]}],
                [${value[4]}, ${value[5]}, ${value[6]}, ${value[7]}],
                [${value[8]}, ${value[9]}, ${value[10]}, ${value[11]}],
                [${value[12]}, ${value[13]}, ${value[14]}, ${value[15]}]
            ]`;
        default:
            return value.toString();
    }
}
