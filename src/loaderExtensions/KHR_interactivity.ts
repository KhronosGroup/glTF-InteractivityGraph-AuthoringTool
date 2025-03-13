import { GLTFLoader, IGLTFLoaderExtension } from '@babylonjs/loaders/glTF/2.0';
import { GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const KHR_INTERACTIVITY_EXTENSION_NAME = 'KHR_interactivity';

/** Babylon extension for KHR_interactivity */
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

/** Three.js extension for KHR_interactivity */
export class KHR_interactivity_three {
    constructor(parser: GLTFParser) {
        this.parser = parser;
    }

    private parser: GLTFParser;

    get name() {
        return KHR_INTERACTIVITY_EXTENSION_NAME;
    }

    beforeRoot() {
        return Promise.resolve();
    }

    afterRoot(result: any) {
        
        // Extract the interactivity graph from the parsed glTF data
        const json = this.parser.json;
        
        const extensions = json.extensions || {};
        const interactivityExt = extensions[KHR_INTERACTIVITY_EXTENSION_NAME];
        
        if (interactivityExt) {
            const graphIndex = interactivityExt.graph || 0;
            const interactivityGraph = interactivityExt.graphs?.[graphIndex];
                        
            if (interactivityGraph) {
                // Store the interactivity graph in the scene's userData for later access
                result.scene.userData = result.scene.userData || {};
                result.scene.userData.behaveGraph = interactivityGraph;
                
                // Also store any animations in the scene's userData for access by ThreeDecorator
                if (result.animations && result.animations.length > 0) {
                    result.scene.userData.animations = result.animations;
                }
            }
        }
        
        return Promise.resolve(result);
    }
}
