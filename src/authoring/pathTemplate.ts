import { IInteractivityValue } from "../BasicBehaveEngine/types/InteractivityGraph";
import { decodeJsonPointerToken, parsePathTemplate, PathTemplateSocket, PathTemplateSocketKind } from "../BasicBehaveEngine/pointerTemplate";

export { parsePathTemplate } from "../BasicBehaveEngine/pointerTemplate";
export { getMessageTemplateSocketIds } from "../BasicBehaveEngine/messageTemplate";
export type { PathTemplateParseResult, PathTemplateSocket, PathTemplateSocketKind } from "../BasicBehaveEngine/pointerTemplate";

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


