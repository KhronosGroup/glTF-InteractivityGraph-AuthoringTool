export type PathTemplateSocketKind = "index" | "ref";

export interface PathTemplateSocket {
    id: string;
    kind: PathTemplateSocketKind;
}

export interface PathTemplateParseResult {
    valid: boolean;
    sockets: PathTemplateSocket[];
}

const decodeJsonPointerToken = (token: string): string => token.replace(/~1/g, "/").replace(/~0/g, "~");

const hasTemplateDelimiter = (value: string): boolean => ["[", "]", "{", "}"].some((delimiter) => value.includes(delimiter));

const isValidJsonPointer = (path: string): boolean => {
    return (path === "" || path.startsWith("/")) && !/(^|[^~])~([^01]|$)/.test(path);
};

const hasOddDelimiterRun = (segment: string, delimiter: string): boolean => {
    const escapedDelimiter = delimiter.replace(/[[\]{}]/g, "\\$&");
    return (segment.match(new RegExp(`${escapedDelimiter}+`, "g")) ?? []).some((run) => run.length % 2 === 1);
};

export const parsePathTemplate = (path: string): PathTemplateParseResult => {
    const sockets: PathTemplateSocket[] = [];
    const seenSocketIds = new Set<string>();

    if (!isValidJsonPointer(path)) {
        return {valid: false, sockets: []};
    }

    for (const segment of path.split("/")) {
        if (segment === "[" || segment === "{") {
            return {valid: false, sockets: []};
        }

        const first = segment[0];
        const second = segment[1];
        let kind: PathTemplateSocketKind | undefined;
        let close: string | undefined;

        if (first === "[" && second !== "[") {
            kind = "index";
            close = "]";
        } else if (first === "{" && second !== "{") {
            kind = "ref";
            close = "}";
        }

        if (kind === undefined || close === undefined) {
            if (
                hasOddDelimiterRun(segment, "[") ||
                hasOddDelimiterRun(segment, "]") ||
                hasOddDelimiterRun(segment, "{") ||
                hasOddDelimiterRun(segment, "}")
            ) {
                return {valid: false, sockets: []};
            }
            continue;
        }

        const encodedId = segment.slice(1, -1);
        if (!segment.endsWith(close) || encodedId.length === 0 || hasTemplateDelimiter(encodedId)) {
            return {valid: false, sockets: []};
        }

        const id = decodeJsonPointerToken(encodedId);
        if (seenSocketIds.has(id)) {
            return {valid: false, sockets: []};
        }

        seenSocketIds.add(id);
        sockets.push({id, kind});
    }

    return {valid: true, sockets};
};

export const getPathTemplateSockets = (path: string): PathTemplateSocket[] => parsePathTemplate(path).sockets;

export const getMessageTemplateSocketIds = (message: string): string[] => {
    const socketIds: string[] = [];
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
                return [];
            }
        } else if (char === "}") {
            if (state === 0) {
                state = 3;
            } else if (state === 3) {
                state = 0;
            } else if (state === 2) {
                socketIds.push(message.slice(paramStart, i));
                state = 0;
            } else {
                return [];
            }
        } else if (state === 1) {
            paramStart = i;
            state = 2;
        } else if (state === 3) {
            return [];
        }
    }

    return state === 0 ? socketIds : [];
};
