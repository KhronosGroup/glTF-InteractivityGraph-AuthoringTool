import { IGLTFLoaderExtension } from "@babylonjs/loaders";
import { GLTFLoader } from "@babylonjs/loaders/glTF/2.0";
import { AbstractMesh } from "@babylonjs/core";

// See also: Commit that adds KHR_node_visibility to BabylonJS 7.x
//   https://github.com/BabylonJS/Babylon.js/commit/01f82d0092d804c75ec9010dded2e8df86a84287#diff-98704e8dc53eb8405b18072a7c7b6d9d0bb37826de8b4a376e48bf433cbae6e7R51
// See also: inheritVisibility in core BabylonJS
//   https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Meshes/abstractMesh.ts#L555

export const KHR_NODE_VISIBILITY_EXTENSION_NAME = 'KHR_node_visibility';
export class KHR_node_visibility implements IGLTFLoaderExtension {
    name = KHR_NODE_VISIBILITY_EXTENSION_NAME;
    enabled: boolean;
    private _loader: GLTFLoader | null = null;

    constructor(loader: GLTFLoader) {
        this._loader = loader;
        this.enabled = this._loader.isExtensionUsed(this.name);
    }
    
    public async onReady(): Promise<void> {
        if (!this._loader) return;
        this._loader.gltf.nodes?.forEach((node) => {
            node._primitiveBabylonMeshes?.forEach((_mesh) => {
                // TODO this is available in a later Babylon version.
                // mesh.inheritVisibility = true;
            });
            // When the JSON Pointer is used we need to change both the transform node and the primitive meshes to the new value.
            if (node.extensions?.KHR_node_visibility) {
                if (node.extensions?.KHR_node_visibility.visible === false) {
                    if (node._babylonTransformNode) {
                        (node._babylonTransformNode as AbstractMesh).isVisible = false;
                    }
                    node._primitiveBabylonMeshes?.forEach((mesh) => {
                        mesh.isVisible = false;
                    });
                }
            }
        });
    }

    dispose(): void {
        this._loader = null;
    }
}