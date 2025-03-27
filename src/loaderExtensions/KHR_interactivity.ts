import { GLTFLoader, IGLTFLoaderExtension } from '@babylonjs/loaders/glTF/2.0';
import { GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const KHR_INTERACTIVITY_EXTENSION_NAME = 'KHR_interactivity';
export const KHR_NODE_VISIBILITY_EXTENSION_NAME = 'KHR_node_visibility';

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

        // Process node visibility if the extension exists
        if (json.nodes) {
            this.processNodeVisibility(result);
        }

        return Promise.resolve(result);
    }

    /**
     * Process node visibility based on the KHR_node_visibility extension
     * This ensures nodes are properly visible/hidden on initial load
     */
    private processNodeVisibility(result: any) {
        const json = this.parser.json;

        // Create a map to store promised nodes
        const nodePromises: Promise<any>[] = [];

        // Queue up promises to get all nodes
        if (json.nodes) {
            for (let i = 0; i < json.nodes.length; i++) {
                const nodePromise = this.parser.getDependency('node', i);
                nodePromises.push(nodePromise);
            }
        }

        // Wait for all nodes to be loaded, then apply visibility
        Promise.all(nodePromises).then(nodes => {
            // Apply visibility settings
            if (json.nodes) {
                for (let i = 0; i < json.nodes.length; i++) {
                    const nodeJson = json.nodes[i];
                    const node = nodes[i];

                    // Check for KHR_node_visibility extension
                    if (nodeJson.extensions && nodeJson.extensions[KHR_NODE_VISIBILITY_EXTENSION_NAME]) {
                        const visibilityExt = nodeJson.extensions[KHR_NODE_VISIBILITY_EXTENSION_NAME];

                        // Mark that this node has its visibility explicitly set
                        node.userData = node.userData || {};
                        node.userData.visibilityOverridden = true;

                        // If visible property is defined, set it
                        if (visibilityExt.visible !== undefined) {
                            node.visible = visibilityExt.visible;

                            // Propagate visibility to children that don't have explicit visibility settings
                            this.propagateVisibility(node, visibilityExt.visible);
                        }
                    }
                }
            }
        });
    }

    /**
     * Propagate visibility to child nodes that don't have their own visibility settings
     */
    private propagateVisibility(node: any, visible: boolean) {
        if (!node || !node.children) return;

        node.children.forEach((child: any) => {
            // Only update children that don't have their own visibility override
            if (!child.userData?.visibilityOverridden) {
                child.visible = visible;
                // Continue propagating to descendants
                this.propagateVisibility(child, visible);
            }
        });
    }
}
