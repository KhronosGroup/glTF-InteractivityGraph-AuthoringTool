// debug/log message template parsing and effective message generation (KHR_interactivity, Debug Output Operations)

export interface MessageTemplateParameter {
    id: string;
    // inclusive range of the "{id}" substring in the message
    start: number;
    end: number;
}

/** Spec state machine; returns undefined when the template is syntactically invalid. */
export const parseMessageTemplate = (message: string): MessageTemplateParameter[] | undefined => {
    const parameters: MessageTemplateParameter[] = [];
    let state = 0;
    let paramStart = 0;

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char === "{") {
            if (state === 0) {
                state = 1;
            } else if (state === 1) {
                state = 0;
            } else {
                return undefined;
            }
        } else if (char === "}") {
            if (state === 0) {
                state = 3;
            } else if (state === 3) {
                state = 0;
            } else if (state === 2) {
                parameters.push({ id: message.slice(paramStart + 1, i), start: paramStart, end: i });
                state = 0;
            } else {
                return undefined;
            }
        } else if (state === 1) {
            paramStart = i - 1;
            state = 2;
        } else if (state === 3) {
            return undefined;
        }
    }

    return state === 0 ? parameters : undefined;
};

/** Unique socket ids of a template; an invalid template has none (the default configuration applies). */
export const getMessageTemplateSocketIds = (message: string): string[] => {
    return [...new Set((parseMessageTemplate(message) ?? []).map((parameter) => parameter.id))];
};

/** Substitute parameters (right to left) with their string forms, then collapse doubled brackets. */
export const populateMessageTemplate = (
    message: string,
    parameters: MessageTemplateParameter[],
    toString: (id: string) => string,
): string => {
    let result = message;
    for (const parameter of [...parameters].sort((a, b) => b.start - a.start)) {
        const text = toString(parameter.id).replace(/{/g, "{{").replace(/}/g, "}}");
        result = result.slice(0, parameter.start) + text + result.slice(parameter.end + 1);
    }
    return result.replace(/{{/g, "{").replace(/}}/g, "}");
};
