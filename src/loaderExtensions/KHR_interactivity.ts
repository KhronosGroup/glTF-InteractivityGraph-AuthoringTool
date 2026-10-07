import { GLTFLoader, IGLTFLoaderExtension } from '@babylonjs/loaders/glTF/2.0';
import { registerGLTFExtension, unregisterGLTFExtension } from '@babylonjs/loaders/glTF/2.0/glTFLoaderExtensionRegistry';
import { buildGltfObjectModel } from '../authoring/gltfObjectModel';

export const KHR_INTERACTIVITY_EXTENSION_NAME = 'KHR_interactivity';
export const AUTHORING_METADATA_EXTENSION_NAME = 'KHR_interactivity_authoring_metadata';

export function registerAuthoringMetadataExtension(): void {
    // Registered as a plain loader extension (not a glTF extension name), so Babylon's own
    // KHR_interactivity stays registered: the native engine view runs graphs with it, the
    // BasicBehaveEngine view loads it parse-only (see loadGltfAssetContainer).
    unregisterGLTFExtension(AUTHORING_METADATA_EXTENSION_NAME);
    registerGLTFExtension(AUTHORING_METADATA_EXTENSION_NAME, false, (loader) => new InteractivityAuthoringMetadata(loader));
}

/** Babylon loader extension that captures the raw glTF data the authoring UI needs */
export class InteractivityAuthoringMetadata implements IGLTFLoaderExtension {
    name: string = AUTHORING_METADATA_EXTENSION_NAME;
    enabled: boolean;
    private _loader: any;

    constructor(loader: GLTFLoader) {
        this._loader = loader;
        // onLoading also captures the raw glTF object model used by the authoring pickers.
        // That snapshot is needed for every glTF, including files without KHR_interactivity.
        this.enabled = true;
    }

    dispose(): void {
        this._loader = null;
    }

    public onLoading(): void {
        const gltf = this._loader?.gltf;
        // spec: only the default graph runs; an omitted `graph` property means 0
        const graphIndex = gltf?.extensions?.KHR_interactivity?.graph ?? 0;
        const interactivityGraph = gltf?.extensions?.KHR_interactivity?.graphs?.[graphIndex];
        this._loader.babylonScene.metadata = this._loader.babylonScene.metadata || {};
        this._loader.babylonScene.metadata.behaveGraph = interactivityGraph;
        // record the glb's declared extensions so the UI can warn about unsupported ones
        this._loader.babylonScene.metadata.gltfExtensionsUsed = gltf?.extensionsUsed ?? [];
        this._loader.babylonScene.metadata.gltfExtensionsRequired = gltf?.extensionsRequired ?? [];
        // asset version feeds the KHR_interactivity Asset Capabilities pointers (spec 4.2.1)
        this._loader.babylonScene.metadata.gltfAsset = gltf?.asset ?? {};
        // snapshot the addressable objects (nodes/meshes/materials/...) for the ref-value picker
        this._loader.babylonScene.metadata.gltfObjectModel = buildGltfObjectModel(gltf);
        // Build a map from glTF node index -> KHR_lights_punctual light index so BabylonDecorator can
        // correctly order scene.lights after loading (Babylon stores the pointer on the light as
        // /nodes/{nodeIndex}/extensions/KHR_lights_punctual, not /extensions/KHR_lights_punctual/lights/{N}).
        const khrLightsNodeToLightIndex: {[nodeIndex: number]: number} = {};
        const rawNodes: any[] = Array.isArray(gltf?.nodes) ? gltf.nodes : [];
        for (let i = 0; i < rawNodes.length; i++) {
            const lightIdx = rawNodes[i]?.extensions?.KHR_lights_punctual?.light;
            if (typeof lightIdx === 'number') {
                khrLightsNodeToLightIndex[i] = lightIdx;
            }
        }
        this._loader.babylonScene.metadata.khrLightsNodeToLightIndex = khrLightsNodeToLightIndex;
    }
}
