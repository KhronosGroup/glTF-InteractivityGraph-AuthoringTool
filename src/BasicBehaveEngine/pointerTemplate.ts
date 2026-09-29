// JSON Pointer Template parsing and effective pointer generation (KHR_interactivity, Object Model Access)

export type PathTemplateSocketKind = "index" | "ref";

export interface PathTemplateSocket {
    id: string;
    kind: PathTemplateSocketKind;
}

export interface PathTemplateParseResult {
    valid: boolean;
    sockets: PathTemplateSocket[];
}

export const decodeJsonPointerToken = (token: string): string => token.replace(/~1/g, "/").replace(/~0/g, "~");

const hasTemplateDelimiter = (value: string): boolean => ["[", "]", "{", "}"].some((delimiter) => value.includes(delimiter));

const isValidJsonPointer = (path: string): boolean => {
    return (path === "" || path.startsWith("/")) && !/(^|[^~])~([^01]|$)/.test(path);
};

const hasOddDelimiterRun = (segment: string, delimiter: string): boolean => {
    const escapedDelimiter = delimiter.replace(/[[\]{}]/g, "\\$&");
    return (segment.match(new RegExp(`${escapedDelimiter}+`, "g")) ?? []).some((run) => run.length % 2 === 1);
};

// spec: a segment is a parameter if it starts with a single "[" (index) or "{" (ref); doubled brackets are literals
const segmentParameterKind = (segment: string): PathTemplateSocketKind | undefined => {
    if (segment[0] === "[" && segment[1] !== "[") return "index";
    if (segment[0] === "{" && segment[1] !== "{") return "ref";
    return undefined;
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

        const kind = segmentParameterKind(segment);
        if (kind === undefined) {
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
        if (!segment.endsWith(kind === "index" ? "]" : "}") || encodedId.length === 0 || hasTemplateDelimiter(encodedId)) {
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

/**
 * Effective JSON Pointer generation: replaces parameter segments with the string value returned by
 * `resolve`, then collapses doubled brackets in literal segments. Assumes a valid template.
 */
export const populatePathTemplate = (path: string, resolve: (socket: PathTemplateSocket) => string): string => {
    return path.split("/").map((segment) => {
        const kind = segmentParameterKind(segment);
        if (kind !== undefined) {
            return resolve({id: decodeJsonPointerToken(segment.slice(1, -1)), kind});
        }
        return segment.replace(/\[\[/g, "[").replace(/]]/g, "]").replace(/{{/g, "{").replace(/}}/g, "}");
    }).join("/");
};
