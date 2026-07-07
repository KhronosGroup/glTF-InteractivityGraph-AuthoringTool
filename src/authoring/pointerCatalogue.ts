import { InteractivityValueType } from "../BasicBehaveEngine/types/InteractivityGraph";
import { standardTypes } from "../BasicBehaveEngine/types/nodes";

/**
 * A catalogue of glTF Object Model JSON pointer templates for the pointer get/set/interpolate
 * authoring nodes. This is the full(ish) Object Model surface; support is resolved at runtime from
 * the active engine decorator's registered pointer registry.
 *
 * Templates use the authoring tool's placeholder syntax:
 *   [name]  -> an integer index input socket (e.g. a node index)
 *   {name}  -> a reference input socket (serialized as a JSON pointer)
 * Selecting an entry inserts the template (which spawns the matching input sockets) and, when the
 * node has a `type` configuration, auto-selects the matching data type.
 *
 * Spec references:
 *  - Object Model: https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/ObjectModel.adoc
 *  - KHR_interactivity: https://github.com/KhronosGroup/glTF/blob/interactivity/extensions/2.0/Khronos/KHR_interactivity/Specification.adoc
 */

export type PointerCategory =
    | "Nodes"
    | "Meshes"
    | "Materials"
    | "Material textures"
    | "Cameras"
    | "Lights"
    | "Animations"
    | "Scene";

export interface PointerCatalogueEntry {
    /** template in authoring syntax, e.g. "/nodes/[node]/translation" */
    template: string;
    /** human-friendly label shown in the dropdown */
    label: string;
    category: PointerCategory;
    /** Object Model data type signature for this property */
    type: InteractivityValueType;
    /** read-only pointers can only be used with pointer/get */
    readOnly: boolean;
    /** the glTF extension this pointer belongs to, if any */
    extension?: string;
}

const t = InteractivityValueType;

// raw catalogue, templates written with named [index] / {ref} slots
const rawCatalogue: PointerCatalogueEntry[] = [
    // ---- Nodes ----
    { template: "/nodes/[node]/translation", label: "Node · translation", category: "Nodes", type: t.FLOAT3, readOnly: false },
    { template: "/nodes/[node]/rotation", label: "Node · rotation (quaternion)", category: "Nodes", type: t.FLOAT4, readOnly: false },
    { template: "/nodes/[node]/scale", label: "Node · scale", category: "Nodes", type: t.FLOAT3, readOnly: false },
    { template: "/nodes/[node]/weights", label: "Node · morph target weights", category: "Nodes", type: t.FLOAT, readOnly: false },
    { template: "/nodes/[node]/matrix", label: "Node · local matrix", category: "Nodes", type: t.FLOAT4X4, readOnly: true },
    { template: "/nodes/[node]/globalMatrix", label: "Node · global matrix", category: "Nodes", type: t.FLOAT4X4, readOnly: true },
    { template: "/nodes/[node]/mesh", label: "Node · mesh index", category: "Nodes", type: t.INT, readOnly: true },
    { template: "/nodes/[node]/camera", label: "Node · camera index", category: "Nodes", type: t.INT, readOnly: true },
    { template: "/nodes/[node]/parent", label: "Node · parent index", category: "Nodes", type: t.INT, readOnly: true },
    { template: "/nodes/[node]/children/[child]", label: "Node · child index", category: "Nodes", type: t.INT, readOnly: true },
    { template: "/nodes/[node]/extensions/KHR_node_visibility/visible", label: "Node · visible", category: "Nodes", type: t.BOOLEAN, readOnly: false, extension: "KHR_node_visibility" },
    { template: "/nodes/[node]/extensions/KHR_node_selectability/selectable", label: "Node · selectable", category: "Nodes", type: t.BOOLEAN, readOnly: false, extension: "KHR_node_selectability" },
    { template: "/nodes/[node]/extensions/KHR_node_hoverability/hoverable", label: "Node · hoverable", category: "Nodes", type: t.BOOLEAN, readOnly: false, extension: "KHR_node_hoverability" },

    // ---- Meshes ----
    { template: "/meshes/[mesh]/weights", label: "Mesh · morph target weights", category: "Meshes", type: t.FLOAT, readOnly: false },
    { template: "/meshes/[mesh]/primitives/[primitive]/material", label: "Mesh primitive · material index", category: "Meshes", type: t.INT, readOnly: false },

    // ---- Materials (core PBR) ----
    { template: "/materials/[material]/pbrMetallicRoughness/baseColorFactor", label: "Material · base color factor", category: "Materials", type: t.FLOAT4, readOnly: false },
    { template: "/materials/[material]/pbrMetallicRoughness/metallicFactor", label: "Material · metallic factor", category: "Materials", type: t.FLOAT, readOnly: false },
    { template: "/materials/[material]/pbrMetallicRoughness/roughnessFactor", label: "Material · roughness factor", category: "Materials", type: t.FLOAT, readOnly: false },
    { template: "/materials/[material]/alphaCutoff", label: "Material · alpha cutoff", category: "Materials", type: t.FLOAT, readOnly: false },
    { template: "/materials/[material]/emissiveFactor", label: "Material · emissive factor", category: "Materials", type: t.FLOAT3, readOnly: false },
    { template: "/materials/[material]/normalTexture/scale", label: "Material · normal texture scale", category: "Materials", type: t.FLOAT, readOnly: false },
    { template: "/materials/[material]/occlusionTexture/strength", label: "Material · occlusion strength", category: "Materials", type: t.FLOAT, readOnly: false },
    // ---- Materials (extensions) ----
    { template: "/materials/[material]/extensions/KHR_materials_emissive_strength/emissiveStrength", label: "Material · emissive strength", category: "Materials", type: t.FLOAT, readOnly: false, extension: "KHR_materials_emissive_strength" },
    { template: "/materials/[material]/extensions/KHR_materials_transmission/transmissionFactor", label: "Material · transmission factor", category: "Materials", type: t.FLOAT, readOnly: false, extension: "KHR_materials_transmission" },
    { template: "/materials/[material]/extensions/KHR_materials_ior/ior", label: "Material · IOR", category: "Materials", type: t.FLOAT, readOnly: false, extension: "KHR_materials_ior" },
    { template: "/materials/[material]/extensions/KHR_materials_volume/thicknessFactor", label: "Material · volume thickness", category: "Materials", type: t.FLOAT, readOnly: false, extension: "KHR_materials_volume" },
    { template: "/materials/[material]/extensions/KHR_materials_volume/attenuationColor", label: "Material · attenuation color", category: "Materials", type: t.FLOAT3, readOnly: false, extension: "KHR_materials_volume" },
    { template: "/materials/[material]/extensions/KHR_materials_specular/specularFactor", label: "Material · specular factor", category: "Materials", type: t.FLOAT, readOnly: false, extension: "KHR_materials_specular" },
    { template: "/materials/[material]/extensions/KHR_materials_specular/specularColorFactor", label: "Material · specular color factor", category: "Materials", type: t.FLOAT3, readOnly: false, extension: "KHR_materials_specular" },
    { template: "/materials/[material]/extensions/KHR_materials_sheen/sheenColorFactor", label: "Material · sheen color factor", category: "Materials", type: t.FLOAT3, readOnly: false, extension: "KHR_materials_sheen" },
    { template: "/materials/[material]/extensions/KHR_materials_sheen/sheenRoughnessFactor", label: "Material · sheen roughness", category: "Materials", type: t.FLOAT, readOnly: false, extension: "KHR_materials_sheen" },
    { template: "/materials/[material]/extensions/KHR_materials_clearcoat/clearcoatFactor", label: "Material · clearcoat factor", category: "Materials", type: t.FLOAT, readOnly: false, extension: "KHR_materials_clearcoat" },
    { template: "/materials/[material]/extensions/KHR_materials_clearcoat/clearcoatRoughnessFactor", label: "Material · clearcoat roughness", category: "Materials", type: t.FLOAT, readOnly: false, extension: "KHR_materials_clearcoat" },
    { template: "/materials/[material]/extensions/KHR_materials_iridescence/iridescenceFactor", label: "Material · iridescence factor", category: "Materials", type: t.FLOAT, readOnly: false, extension: "KHR_materials_iridescence" },
    { template: "/materials/[material]/extensions/KHR_materials_anisotropy/anisotropyStrength", label: "Material · anisotropy strength", category: "Materials", type: t.FLOAT, readOnly: false, extension: "KHR_materials_anisotropy" },
    { template: "/materials/[material]/extensions/KHR_materials_anisotropy/anisotropyRotation", label: "Material · anisotropy rotation", category: "Materials", type: t.FLOAT, readOnly: false, extension: "KHR_materials_anisotropy" },

    // ---- Material texture transforms (KHR_texture_transform) ----
    ...(["pbrMetallicRoughness/baseColorTexture", "pbrMetallicRoughness/metallicRoughnessTexture", "normalTexture", "occlusionTexture", "emissiveTexture"] as const).flatMap(
        (texture): PointerCatalogueEntry[] => {
            const textureLabel = texture.split("/").pop()!;
            return [
                { template: `/materials/[material]/${texture}/extensions/KHR_texture_transform/offset`, label: `Texture transform · ${textureLabel} offset`, category: "Material textures", type: t.FLOAT2, readOnly: false, extension: "KHR_texture_transform" },
                { template: `/materials/[material]/${texture}/extensions/KHR_texture_transform/scale`, label: `Texture transform · ${textureLabel} scale`, category: "Material textures", type: t.FLOAT2, readOnly: false, extension: "KHR_texture_transform" },
                { template: `/materials/[material]/${texture}/extensions/KHR_texture_transform/rotation`, label: `Texture transform · ${textureLabel} rotation`, category: "Material textures", type: t.FLOAT, readOnly: false, extension: "KHR_texture_transform" },
            ];
        }
    ),

    // ---- Cameras ----
    { template: "/cameras/[camera]/perspective/yfov", label: "Camera · perspective yfov", category: "Cameras", type: t.FLOAT, readOnly: false },
    { template: "/cameras/[camera]/perspective/aspectRatio", label: "Camera · perspective aspect ratio", category: "Cameras", type: t.FLOAT, readOnly: false },
    { template: "/cameras/[camera]/perspective/znear", label: "Camera · perspective znear", category: "Cameras", type: t.FLOAT, readOnly: false },
    { template: "/cameras/[camera]/perspective/zfar", label: "Camera · perspective zfar", category: "Cameras", type: t.FLOAT, readOnly: false },
    { template: "/cameras/[camera]/orthographic/xmag", label: "Camera · orthographic xmag", category: "Cameras", type: t.FLOAT, readOnly: false },
    { template: "/cameras/[camera]/orthographic/ymag", label: "Camera · orthographic ymag", category: "Cameras", type: t.FLOAT, readOnly: false },
    { template: "/cameras/[camera]/orthographic/znear", label: "Camera · orthographic znear", category: "Cameras", type: t.FLOAT, readOnly: false },
    { template: "/cameras/[camera]/orthographic/zfar", label: "Camera · orthographic zfar", category: "Cameras", type: t.FLOAT, readOnly: false },

    // ---- Lights (KHR_lights_punctual) ----
    { template: "/extensions/KHR_lights_punctual/lights/[light]/color", label: "Light · color", category: "Lights", type: t.FLOAT3, readOnly: false, extension: "KHR_lights_punctual" },
    { template: "/extensions/KHR_lights_punctual/lights/[light]/intensity", label: "Light · intensity", category: "Lights", type: t.FLOAT, readOnly: false, extension: "KHR_lights_punctual" },
    { template: "/extensions/KHR_lights_punctual/lights/[light]/range", label: "Light · range", category: "Lights", type: t.FLOAT, readOnly: false, extension: "KHR_lights_punctual" },
    { template: "/extensions/KHR_lights_punctual/lights/[light]/spot/innerConeAngle", label: "Light · spot inner cone angle", category: "Lights", type: t.FLOAT, readOnly: false, extension: "KHR_lights_punctual" },
    { template: "/extensions/KHR_lights_punctual/lights/[light]/spot/outerConeAngle", label: "Light · spot outer cone angle", category: "Lights", type: t.FLOAT, readOnly: false, extension: "KHR_lights_punctual" },

    // ---- Animations (KHR_interactivity) ----
    { template: "/animations/[animation]/extensions/KHR_interactivity/isPlaying", label: "Animation · is playing", category: "Animations", type: t.BOOLEAN, readOnly: true, extension: "KHR_interactivity" },
    { template: "/animations/[animation]/extensions/KHR_interactivity/minTime", label: "Animation · min time", category: "Animations", type: t.FLOAT, readOnly: true, extension: "KHR_interactivity" },
    { template: "/animations/[animation]/extensions/KHR_interactivity/maxTime", label: "Animation · max time", category: "Animations", type: t.FLOAT, readOnly: true, extension: "KHR_interactivity" },
    { template: "/animations/[animation]/extensions/KHR_interactivity/playhead", label: "Animation · playhead", category: "Animations", type: t.FLOAT, readOnly: true, extension: "KHR_interactivity" },
    { template: "/animations/[animation]/extensions/KHR_interactivity/virtualPlayhead", label: "Animation · virtual playhead", category: "Animations", type: t.FLOAT, readOnly: false, extension: "KHR_interactivity" },

    // ---- Scene / counts (read-only) ----
    { template: "/nodes.length", label: "Count · nodes", category: "Scene", type: t.INT, readOnly: true },
    { template: "/materials.length", label: "Count · materials", category: "Scene", type: t.INT, readOnly: true },
    { template: "/meshes.length", label: "Count · meshes", category: "Scene", type: t.INT, readOnly: true },
    { template: "/cameras.length", label: "Count · cameras", category: "Scene", type: t.INT, readOnly: true },
    { template: "/animations.length", label: "Count · animations", category: "Scene", type: t.INT, readOnly: true },

    // ---- Active camera (KHR_interactivity) ----
    { template: "/extensions/KHR_interactivity/activeCamera/position", label: "Active camera · position", category: "Cameras", type: t.FLOAT3, readOnly: true, extension: "KHR_interactivity" },
    { template: "/extensions/KHR_interactivity/activeCamera/rotation", label: "Active camera · rotation", category: "Cameras", type: t.FLOAT4, readOnly: true, extension: "KHR_interactivity" },
];

/**
 * Normalize a template to a canonical shape for comparison: every index/ref slot and every numeric
 * path segment collapses to "{}". e.g. "/nodes/[node]/children/[child]" -> "/nodes/{}/children/{}".
 */
export const normalizePointerTemplate = (template: string): string =>
    template
        .split("/")
        .map((segment) => {
            if (/^\[.*\]$/.test(segment) || /^\{.*\}$/.test(segment)) return "{}";
            if (segment !== "" && !isNaN(Number(segment))) return "{}";
            return segment;
        })
        .join("/");

/** Build a normalized template set from concrete registered JSON pointer paths. */
export const buildNormalizedTemplateSet = (paths: readonly string[]): ReadonlySet<string> =>
    new Set(paths.map((path) => normalizePointerTemplate(path)));

/**
 * Returns pointer support status from runtime registry templates.
 * `undefined` means support is not known yet (e.g. no engine initialized yet).
 */
export const isPointerTemplateSupported = (
    template: string,
    supportedTemplates: ReadonlySet<string> | null
): boolean | undefined => {
    if (supportedTemplates === null) return undefined;
    return supportedTemplates.has(normalizePointerTemplate(template));
};

/** Static catalogue metadata; support is resolved dynamically against runtime templates. */
export const pointerCatalogue: PointerCatalogueEntry[] = rawCatalogue;

/** Resolve an Object Model type signature to its standard type index, or -1 if unknown. */
export const getStandardTypeIndexForSignature = (signature: InteractivityValueType): number =>
    standardTypes.findIndex((type) => type.signature === signature);

/** Look up a catalogue entry by exact template string. */
export const findPointerCatalogueEntry = (template: string): PointerCatalogueEntry | undefined =>
    pointerCatalogue.find((entry) => entry.template === template);
