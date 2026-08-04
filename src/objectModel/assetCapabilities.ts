import { SUPPORTED_GLTF_EXTENSIONS } from "../diagnostics";

/**
 * Asset Capabilities and Implementation-Specific Runtime Limits (KHR_interactivity spec 4.2.1 / 4.2.2).
 * Shared by both engine decorators (the headless GlTFObjectModelDecorator and the BabylonDecorator).
 */

const ASSET_EXTENSION_ENABLED_RE = /^\/extensions\/KHR_interactivity\/asset\/extensions\/([^/]+)\/enabled$/;

/** Parse a glTF `asset.version` string (e.g. "2.0") into [major, minor], defaulting to glTF 2.0. */
export function parseGltfVersion(version: unknown): [number, number] {
    const [major, minor] = String(version ?? "2.0").split(".").map((part) => Number.parseInt(part, 10));
    return [Number.isFinite(major) ? major : 2, Number.isFinite(minor) ? minor : 0];
}

/**
 * Runtime limits reported by `/extensions/KHR_interactivity/limits/*` (spec 4.2.2). This engine does
 * not cap active animations/delays/interpolations, so it reports the max int, which the spec permits
 * for implementations that have no explicit limit.
 */
export const KHR_INTERACTIVITY_LIMITS: ReadonlyArray<{ name: string; value: number }> = [
    { name: "maxActiveAnimations", value: 2147483647 },
    { name: "maxActiveDelays", value: 2147483647 },
    { name: "maxActivePropertyInterpolations", value: 2147483647 },
    { name: "maxActiveVariableInterpolations", value: 2147483647 },
];

/**
 * Resolve an asset extension `enabled` capability pointer (spec 4.2.1). Returns whether the named
 * extension is enabled (declared in the asset's extensionsUsed AND supported by this implementation),
 * or `undefined` if `path` is not an asset extension `enabled` pointer at all. The pointer is always
 * valid for any extension name; the boolean value conveys support, so a graph can branch on it.
 */
export function assetExtensionEnabled(path: string, extensionsUsed: readonly string[]): boolean | undefined {
    const match = ASSET_EXTENSION_ENABLED_RE.exec(path);
    if (match === null) {
        return undefined;
    }
    const extensionName = match[1];
    return extensionsUsed.includes(extensionName) && SUPPORTED_GLTF_EXTENSIONS.has(extensionName);
}
