export type DiagnosticSeverity = 'error' | 'warning';
export type DiagnosticCategory = 'extension' | 'operation' | 'type';

export interface IGraphDiagnostic {
    severity: DiagnosticSeverity;
    category: DiagnosticCategory;
    title: string;
    detail?: string;
}

/**
 * glTF extensions this tool can load and/or interpret. Anything found in a glb's
 * extensionsUsed/extensionsRequired that is not in this set is surfaced to the user
 * as a diagnostic. Includes both the interactivity-related extensions handled by the
 * decorators and the common asset extensions Babylon understands out of the box.
 */
export const SUPPORTED_GLTF_EXTENSIONS: ReadonlySet<string> = new Set<string>([
    // interactivity related
    'KHR_interactivity',
    'KHR_node_visibility',
    'KHR_node_selectability',
    'KHR_node_hoverability',
    'KHR_physics_rigid_bodies',
    // materials / textures handled by the renderers
    'KHR_materials_emissive_strength',
    'KHR_materials_transmission',
    'KHR_materials_unlit',
    'KHR_materials_clearcoat',
    'KHR_materials_ior',
    'KHR_materials_sheen',
    'KHR_materials_specular',
    'KHR_materials_volume',
    'KHR_materials_iridescence',
    'KHR_materials_anisotropy',
    'KHR_materials_dispersion',
    'KHR_materials_variants',
    'KHR_texture_transform',
    'KHR_texture_basisu',
    'KHR_lights_punctual',
    'KHR_animation_pointer',
    // geometry / compression
    'KHR_draco_mesh_compression',
    'KHR_mesh_quantization',
    'EXT_meshopt_compression',
    'EXT_texture_webp',
]);

/**
 * Build diagnostics for glTF extensions that this tool does not support. Extensions listed
 * in extensionsRequired are reported as errors (the asset asks for behavior we cannot honor);
 * extensions only in extensionsUsed are reported as warnings (they are simply ignored).
 */
export const computeExtensionDiagnostics = (
    extensionsUsed: string[] = [],
    extensionsRequired: string[] = [],
): IGraphDiagnostic[] => {
    const required = new Set(extensionsRequired);
    // union of both lists so a required extension missing from extensionsUsed is still caught
    const allExtensions = new Set<string>([...(extensionsUsed || []), ...(extensionsRequired || [])]);

    const diagnostics: IGraphDiagnostic[] = [];
    for (const ext of allExtensions) {
        if (SUPPORTED_GLTF_EXTENSIONS.has(ext)) {
            continue;
        }
        const isRequired = required.has(ext);
        diagnostics.push({
            severity: isRequired ? 'error' : 'warning',
            category: 'extension',
            title: `${isRequired ? 'Unsupported required extension' : 'Unknown extension'}: ${ext}`,
            detail: isRequired
                ? `This glTF lists "${ext}" in extensionsRequired, but this tool does not support it. The model may not load or behave as intended.`
                : `This glTF uses "${ext}", which this tool does not explicitly support. It will be ignored.`,
        });
    }
    return diagnostics;
};
