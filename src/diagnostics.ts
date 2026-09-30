import { GraphRejectedError } from './BasicBehaveEngine/BasicBehaveEngine';

export type DiagnosticSeverity = 'error' | 'warning';
export type DiagnosticCategory = 'extension' | 'operation' | 'type' | 'node' | 'graph' | 'execution';

/**
 * What the issue means for running the graph, ordered from hardest to softest. Where the
 * KHR_interactivity / glTF specs define the outcome, the impact follows them.
 */
export type DiagnosticImpact = 'assetRejected' | 'graphRejected' | 'executionStopped' | 'noOp' | 'ignored';

export const SPEC_URL = 'https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_interactivity/Specification.adoc';

export const impactInfo: Record<DiagnosticImpact, { label: string; description: string }> = {
    assetRejected: {
        label: 'Asset rejected',
        description: 'glTF 2.0: a loader that does not support a required extension must fail to load the asset.',
    },
    graphRejected: {
        label: 'Graph rejected',
        description: 'KHR_interactivity: the graph is invalid and a conforming engine must reject it, so none of it runs.',
    },
    executionStopped: {
        label: 'Execution stopped',
        description: 'This engine hit an error while running the graph and stopped executing it.',
    },
    noOp: {
        label: 'Runs as no-op',
        description: 'KHR_interactivity: input flows are ignored, output flows never activate and outputs are type-defaults. The rest of the graph still runs.',
    },
    ignored: {
        label: 'Ignored',
        description: 'Allowed by the spec; it has no effect on execution.',
    },
};

export interface IGraphDiagnostic {
    severity: DiagnosticSeverity;
    category: DiagnosticCategory;
    title: string;
    detail?: string;
    // present when this diagnostic is attributable to a single node instance (currently only
    // 'node'-category socket/type spec-validity diagnostics) - lets the UI jump to that node
    nodeUid?: string;
    nodeIndex?: number;
    nodeOp?: string;
    // present when this diagnostic is attributable to a single input socket on that node (live
    // socket warnings from computeNodeLiveWarnings) - lets the node UI show it inline per socket
    socket?: string;
    impact?: DiagnosticImpact;
    // spec section the impact comes from, shown next to it
    specSection?: string;
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
            impact: isRequired ? 'assetRejected' : 'ignored',
            title: `${isRequired ? 'Unsupported required extension' : 'Unknown extension'}: ${ext}`,
            detail: isRequired
                ? `This glTF lists "${ext}" in extensionsRequired, but this tool does not support it. The model may not load or behave as intended.`
                : `This glTF uses "${ext}", which this tool does not explicitly support. It will be ignored.`,
        });
    }
    return diagnostics;
};

/** The runtime engine failed to load or run the graph; a GraphRejectedError is a load-time rejection. */
export const computeExecutionDiagnostics = (error: unknown): IGraphDiagnostic[] => {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof GraphRejectedError) {
        return [{
            severity: 'error',
            category: 'execution',
            impact: 'graphRejected',
            title: 'The runtime engine rejected the graph',
            detail: message,
        }];
    }
    return [{
        severity: 'error',
        category: 'execution',
        impact: 'executionStopped',
        title: 'Graph execution stopped with an error',
        detail: `${message} Nothing after this point runs until the graph is reloaded.`,
    }];
};
