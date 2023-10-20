import { GLTFLoader, IGLTFLoaderExtension } from '@babylonjs/loaders/glTF/2.0';
import { IScene } from '@babylonjs/loaders/glTF/2.0/glTFLoaderInterfaces';
import { Nullable } from '@babylonjs/core/types.js';

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

    loadSceneAsync(context: string, scene: IScene): Nullable<Promise<void>> {
        // this is a hack, we should change the IGLTFLoaderExtension but that is part of babylonjs so for now I just copy the extension to the scene before loading
        scene.extensions = this._loader.gltf.extensions;
        return GLTFLoader.LoadExtensionAsync(context, scene, this.name, (extensionContext, extension) => {
            const promises = new Array<Promise<any>>();
            promises.push(this._loader.loadSceneAsync(context, scene));
            if (scene.extensions && scene.extensions.KHR_interactivity && scene.extensions.KHR_interactivity.graph) {
                const p = async () => {
                    this._loader.babylonScene.extras = this._loader.babylonScene.extras || {};
                    this._loader.babylonScene.extras.behaveGraph = scene.extensions!.KHR_interactivity.graph;
                };
                promises.push(p());
            }

            return Promise.all(promises).then(() => {
                //no op
            });
        });
    }
}

//https://github.com/KhronosGroup/glTF/pull/2293/files
