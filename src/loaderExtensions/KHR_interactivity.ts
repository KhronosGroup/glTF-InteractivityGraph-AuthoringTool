import { GLTFLoader, IGLTFLoaderExtension } from '@babylonjs/loaders/glTF/2.0';

export const KHR_INTERACTIVITY_EXTENSION_NAME = 'KHR_interactivity';
export class KHR_interactivity implements IGLTFLoaderExtension {
    name: string = KHR_INTERACTIVITY_EXTENSION_NAME;
    enabled: boolean;
    private _loader: any;

    constructor(loader: GLTFLoader) {
        this._loader = loader;
        this.enabled = this._loader.isExtensionUsed(this.name);
    }

    dispose(): void {
        this._loader = null;
    }

    public onLoading(): void {
        console.log(this._loader?.gltf);
        const graphIndex = this._loader?.gltf.extensions?.KHR_interactivity?.graph;
        const interactivityGraph = this._loader?.gltf.extensions?.KHR_interactivity?.graphs[graphIndex];
        this._loader.babylonScene.metadata = this._loader.babylonScene.metadata || {};
        this._loader.babylonScene.metadata.behaveGraph = interactivityGraph;
    }
}

//https://github.com/KhronosGroup/glTF/pull/2293/files
