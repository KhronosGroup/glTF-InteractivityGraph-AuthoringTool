import { IInteractivityValue } from "../BasicBehaveEngine/types/InteractivityGraph";

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

const encodeJsonPointerToken = (token: string): string => token.replace(/~/g, "~0").replace(/\//g, "~1");

/**
 * Rename a slot id to match its new kind, keeping the "Index"/"Ref" naming convention in
 * sync with the socket type, e.g. nodeIndex <-> nodeRef. Only ids that actually carry the
 * "Index"/"Ref" marker are touched; anything else is left as-is.
 */
export const renamePathTemplateSlotId = (id: string, kind: PathTemplateSocketKind): string => {
    if (kind === "ref") {
        if (id.includes("Index")) return id.replace(/Index/g, "Ref");
        if (id === "index") return "ref";
    } else {
        if (id.includes("Ref")) return id.replace(/Ref/g, "Index");
        if (id === "ref") return "index";
    }
    return id;
};

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

/**
 * The JSON-pointer prefix of the object a ref slot references within a pointer template, e.g. slot
 * `node` in `/nodes/{node}/translation` -> `/nodes` (so index 3 becomes the ref pointer `/nodes/3`).
 * Returns undefined if the slot isn't a `{...}` placeholder in the template.
 */
export const getRefSlotPointerPrefix = (template: string, slotId: string): string | undefined => {
    const segments = template.split("/");
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (segment.startsWith("{") && segment.endsWith("}") && decodeJsonPointerToken(segment.slice(1, -1)) === slotId) {
            return segments.slice(0, i).join("/");
        }
    }
    return undefined;
};

/**
 * Build the input value socket entry for a pointer-template slot (a `{ref}`/`[index]` placeholder).
 *
 * When the node already carries data for that slot — a static value loaded from a glTF file, or a
 * wire to another node's output — that data is preserved instead of being reset to `[undefined]`, so
 * loading a graph does not wipe the ref/index value the file stored. `preserved` reports whether
 * existing data was kept; callers use it to decide whether the slot should be treated as freshly
 * (re)generated (and thus eligible to reset a stale, type-mismatched socket) — a preserved slot must
 * not be reset just because the file stored it with a different concrete type.
 *
 * A ref slot holds a JSON pointer string (e.g. `/nodes/3`), but a spec-compliant file may store the
 * referenced object as a bare integer index (`3`). When `refPointerPrefix` is given, such an index is
 * normalized to the pointer string the authoring ref field/picker expect (`/nodes/3`).
 */
export const buildPointerSlotValue = (
    existing: IInteractivityValue | undefined,
    kind: PathTemplateSocketKind,
    type: number,
    refPointerPrefix?: string
): { value: IInteractivityValue; preserved: boolean } => {
    const hasData = existing !== undefined && (existing.value?.[0] != null || existing.node != null);
    if (!hasData) {
        return { value: { value: [undefined], typeOptions: [type], type }, preserved: false };
    }
    // a wire keeps its connection untouched (its type is dictated by the source socket)
    if (existing!.node != null) {
        return { value: { ...existing!, typeOptions: [type] }, preserved: true };
    }
    let value = existing!.value;
    const raw = value?.[0];
    if (kind === "ref" && refPointerPrefix !== undefined && typeof raw === "number" && Number.isFinite(raw)) {
        value = [`${refPointerPrefix}/${raw}`];
    }
    return { value: { ...existing!, value, typeOptions: [type], type }, preserved: true };
};

/**
 * Rewrite a single template slot to the given kind, swapping its delimiters:
 * index -> [id], ref -> {id}. The slot is matched by its decoded id. Its id is also
 * renamed to keep the "Index"/"Ref" naming convention in sync with the kind
 * (e.g. nodeIndex <-> nodeRef), unless that rename would collide with another slot.
 * Segments that are not the target slot are left untouched. Returns the path unchanged
 * if the slot is not found.
 */
export const setPathTemplateSlotKind = (path: string, slotId: string, kind: PathTemplateSocketKind): string => {
    const [open, close] = kind === "index" ? ["[", "]"] : ["{", "}"];
    const existingIds = new Set(getPathTemplateSockets(path).map((socket) => socket.id));
    return path
        .split("/")
        .map((segment) => {
            const isIndex = segment.startsWith("[") && segment.endsWith("]");
            const isRef = segment.startsWith("{") && segment.endsWith("}");
            if (!isIndex && !isRef) {
                return segment;
            }
            const encodedId = segment.slice(1, -1);
            const decodedId = decodeJsonPointerToken(encodedId);
            if (decodedId !== slotId) {
                return segment;
            }
            const renamedId = renamePathTemplateSlotId(decodedId, kind);
            // keep the original id if the renamed one would clash with another slot
            const newId = renamedId !== decodedId && existingIds.has(renamedId) ? decodedId : renamedId;
            return `${open}${encodeJsonPointerToken(newId)}${close}`;
        })
        .join("/");
};

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
