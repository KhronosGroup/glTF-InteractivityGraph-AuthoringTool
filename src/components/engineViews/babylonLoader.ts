import { AssetContainer, LoadAssetContainerAsync, Scene } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { GLTFLoaderAnimationStartMode } from "@babylonjs/loaders/glTF/glTFFileLoader";
import { KHR_INTERACTIVITY_EXTENSION_NAME, registerAuthoringMetadataExtension } from "../../loaderExtensions/KHR_interactivity";
import { storeSkinnedMeshMetadata } from "./babylonLoadedModel";

export interface GltfContainerLoadOptions {
    pluginExtension: string;
    /** file name, needed to identify a data: URL or File source */
    name?: string;
    /**
     * build graphs for Babylon's own KHR_interactivity runtime (left unstarted, so listeners can be
     * attached before event/onStart; see startNativeGraph); otherwise Babylon only parses them
     */
    nativeInteractivity?: boolean;
    /** called with the parsed glTF JSON before Babylon reads it, so it may be modified */
    onParsedJson?: (json: any) => void;
}

/**
 * Loads a glTF/glb into an asset container with per-call loader options (no global
 * OnPluginActivated observers, so the Babylon views never configure each other's loads).
 */
export async function loadGltfAssetContainer(source: string | File, scene: Scene, options: GltfContainerLoadOptions): Promise<AssetContainer> {
    registerAuthoringMetadataExtension();
    // Not disabled outright in the BasicBehaveEngine view: a disabled extension listed in
    // extensionsRequired makes Babylon reject the whole asset.
    const interactivityOptions = options.nativeInteractivity ? { autoStart: false } : { parseOnly: true };
    return LoadAssetContainerAsync(source, scene, {
        rootUrl: typeof source === "string" ? undefined : "file:",
        pluginExtension: options.pluginExtension,
        name: options.name,
        pluginOptions: {
            gltf: {
                animationStartMode: GLTFLoaderAnimationStartMode.NONE,
                onSkinLoaded: storeSkinnedMeshMetadata,
                onParsed: options.onParsedJson ? (data) => options.onParsedJson!(data.json) : undefined,
                extensionOptions: { [KHR_INTERACTIVITY_EXTENSION_NAME]: interactivityOptions } as any,
            },
        },
    });
}
