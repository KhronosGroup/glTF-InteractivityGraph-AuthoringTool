import { InteractivityValueType } from "../BasicBehaveEngine/types/InteractivityGraph";
import { standardTypes } from "../BasicBehaveEngine/types/nodes";

/**
 * Color map for interactivity socket types. Each data type gets a distinct color so that a socket
 * handle and any wiring carrying that type share a consistent color; flow sockets/edges get their
 * own color. Used by both the node handles (AuthoringGraphNode) and the edges (getAuthorGraph / onConnect).
 */

/** Flow control sockets/edges (matches the flow node header hue). */
export const FLOW_COLOR = "#b18cd9";

/** Fallback for unknown / custom types. */
export const DEFAULT_SOCKET_COLOR = "#868484";

export const TYPE_COLORS: Record<string, string> = {
    [InteractivityValueType.BOOLEAN]: "#d05c65", // red
    [InteractivityValueType.INT]: "#4e9a51",     // green
    [InteractivityValueType.FLOAT]: "#4a90d9",   // blue
    [InteractivityValueType.FLOAT2]: "#2bb0a3",  // teal
    [InteractivityValueType.FLOAT3]: "#e0913a",  // orange
    [InteractivityValueType.FLOAT4]: "#c264a8",  // magenta
    [InteractivityValueType.FLOAT2X2]: "#9aa0a6",// light gray
    [InteractivityValueType.FLOAT3X3]: "#7a828a",// gray
    [InteractivityValueType.FLOAT4X4]: "#565c62",// dark gray
    [InteractivityValueType.REF]: "#d98c00",     // amber
    [InteractivityValueType.CUSTOM]: "#9b7653",  // brown
};

/** Resolve a color from a standard-types index (as stored on sockets). */
export const getColorForTypeIndex = (typeIndex: number | undefined): string => {
    if (typeIndex === undefined) {
        return DEFAULT_SOCKET_COLOR;
    }
    const signature = standardTypes[typeIndex]?.signature;
    return (signature && TYPE_COLORS[signature]) || DEFAULT_SOCKET_COLOR;
};

/** Resolve a color from a type signature string. */
export const getColorForSignature = (signature: string | undefined): string =>
    (signature && TYPE_COLORS[signature]) || DEFAULT_SOCKET_COLOR;

/** Short label for a socket's data type, e.g. "float3" (used for the socket type badge). */
export const getTypeLabel = (typeIndex: number | undefined): string => {
    if (typeIndex === undefined) {
        return "?";
    }
    return standardTypes[typeIndex]?.name ?? standardTypes[typeIndex]?.signature ?? String(typeIndex);
};
