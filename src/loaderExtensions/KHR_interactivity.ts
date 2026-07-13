import { GLTFLoader, IGLTFLoaderExtension } from '@babylonjs/loaders/glTF/2.0';
import { registerGLTFExtension, unregisterGLTFExtension } from '@babylonjs/loaders/glTF/2.0/glTFLoaderExtensionRegistry';
import { buildGltfObjectModel } from '../authoring/gltfObjectModel';

export const KHR_INTERACTIVITY_EXTENSION_NAME = 'KHR_interactivity';
export const KHR_NODE_VISIBILITY_EXTENSION_NAME = 'KHR_node_visibility';

export function registerKHRInteractivityExtension(): void {
    // Babylon ships its own KHR_interactivity executor. This application executes the graph
    // through BasicBehaveEngine, so replace Babylon's extension with the metadata-only loader.
    unregisterGLTFExtension(KHR_INTERACTIVITY_EXTENSION_NAME);
    registerGLTFExtension(KHR_INTERACTIVITY_EXTENSION_NAME, false, (loader) => new KHR_interactivity(loader));
}

/** Babylon extension for KHR_interactivity */
export class KHR_interactivity implements IGLTFLoaderExtension {
    name: string = KHR_INTERACTIVITY_EXTENSION_NAME;
    enabled: boolean;
    private _loader: any;

    constructor(loader: GLTFLoader) {
        this._loader = loader;
        // onLoading also captures the raw glTF object model used by the authoring pickers.
        // That snapshot is needed for every glTF, including files without KHR_interactivity.
        // The hook is read-only when the extension is absent, so it is safe to keep enabled.
        this.enabled = true;
    }

    dispose(): void {
        this._loader = null;
    }

    public onLoading(): void {
        const gltf = this._loader?.gltf;
        const graphIndex = gltf?.extensions?.KHR_interactivity?.graph;
        const interactivityGraph = gltf?.extensions?.KHR_interactivity?.graphs?.[graphIndex];
        this._loader.babylonScene.metadata = this._loader.babylonScene.metadata || {};
        this._loader.babylonScene.metadata.behaveGraph = interactivityGraph;
        // record the glb's declared extensions so the UI can warn about unsupported ones
        this._loader.babylonScene.metadata.gltfExtensionsUsed = gltf?.extensionsUsed ?? [];
        this._loader.babylonScene.metadata.gltfExtensionsRequired = gltf?.extensionsRequired ?? [];
        // snapshot the addressable objects (nodes/meshes/materials/...) for the ref-value picker
        this._loader.babylonScene.metadata.gltfObjectModel = buildGltfObjectModel(gltf);
    }
}
