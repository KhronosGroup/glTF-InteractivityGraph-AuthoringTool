import { GLTFLoader, IGLTFLoaderExtension } from '@babylonjs/loaders/glTF/2.0';
import { registerGLTFExtension, unregisterGLTFExtension } from '@babylonjs/loaders/glTF/2.0/glTFLoaderExtensionRegistry';
import { Animation, Material, PBRMaterial } from '@babylonjs/core';
import type { IAnimation, IAnimationChannel } from '@babylonjs/loaders/glTF/2.0/glTFLoaderInterfaces';
import type { IAnimatable } from '@babylonjs/core/Animations/animatable.interface';
import { loadBabylonAssetAnimationChannel } from './babylonAssetAnimations';
import { BabylonAssetModel, attachBabylonAssetModel } from '../components/engineViews/babylonAssetModel';
import { buildGltfObjectModel } from '../authoring/gltfObjectModel';
import { getDefaultInteractivityGraph } from '../BasicBehaveEngine/validateInteractivity';

export const KHR_INTERACTIVITY_EXTENSION_NAME = 'KHR_interactivity';
export const KHR_NODE_VISIBILITY_EXTENSION_NAME = 'KHR_node_visibility';

export function registerKHRInteractivityExtension(): void {
    // Babylon ships its own KHR_interactivity executor. This application executes the graph
    // through BasicBehaveEngine, so replace Babylon's executor with our asset loader.
    unregisterGLTFExtension(KHR_INTERACTIVITY_EXTENSION_NAME);
    registerGLTFExtension(KHR_INTERACTIVITY_EXTENSION_NAME, false, (loader) => new KHR_interactivity(loader));
}

/** Babylon extension for KHR_interactivity */
export class KHR_interactivity implements IGLTFLoaderExtension {
    name: string = KHR_INTERACTIVITY_EXTENSION_NAME;
    enabled: boolean;
    private _loader: any;
    private assetModel?: BabylonAssetModel;

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
        this._loader.babylonScene.metadata = this._loader.babylonScene.metadata || {};
        // spec: only the default graph runs; an invalid extension object runs no graph at all
        const extension = gltf?.extensions?.KHR_interactivity;
        let interactivityGraph: any;
        let interactivityError: string | undefined;
        if (extension !== undefined) {
            try {
                interactivityGraph = getDefaultInteractivityGraph(extension);
            } catch (error) {
                interactivityError = error instanceof Error ? error.message : String(error);
            }
        }
        this._loader.babylonScene.metadata.behaveGraph = interactivityGraph;
        this._loader.babylonScene.metadata.interactivityExtensionError = interactivityError;
        // record the glb's declared extensions so the UI can warn about unsupported ones
        this._loader.babylonScene.metadata.gltfExtensionsUsed = gltf?.extensionsUsed ?? [];
        this._loader.babylonScene.metadata.gltfExtensionsRequired = gltf?.extensionsRequired ?? [];
        // asset version feeds the KHR_interactivity Asset Capabilities pointers (spec 4.2.1)
        this._loader.babylonScene.metadata.gltfAsset = gltf?.asset ?? {};
        this._loader.babylonScene.metadata.gltfCameraDefinitions = gltf?.cameras ?? [];
        // snapshot the addressable objects (nodes/meshes/materials/...) for the ref-value picker
        this._loader.babylonScene.metadata.gltfObjectModel = buildGltfObjectModel(gltf);
        const rawNodes: any[] = Array.isArray(gltf?.nodes) ? gltf.nodes : [];
        const assetModel = new BabylonAssetModel(gltf);
        this.assetModel = assetModel;
        this._loader.babylonScene.metadata.gltfStructure = assetModel.structure;
        const root = this._loader.rootBabylonMesh;
        if (root) attachBabylonAssetModel(root, assetModel);
        // Build a map from glTF node index -> KHR_lights_punctual light index so BabylonDecorator can
        // correctly order scene.lights after loading (Babylon 7.x stores the pointer on the light as
        // /nodes/{nodeIndex}/extensions/KHR_lights_punctual, not /extensions/KHR_lights_punctual/lights/{N}).
        const khrLightsNodeToLightIndex: {[nodeIndex: number]: number} = {};
        for (let i = 0; i < rawNodes.length; i++) {
            const lightIdx = rawNodes[i]?.extensions?.KHR_lights_punctual?.light;
            if (typeof lightIdx === 'number') {
                khrLightsNodeToLightIndex[i] = lightIdx;
            }
        }
        this._loader.babylonScene.metadata.khrLightsNodeToLightIndex = khrLightsNodeToLightIndex;
    }

    public _loadAnimationChannelAsync(context: string, animationContext: string, animation: IAnimation, channel: IAnimationChannel,
        onLoad: (target: IAnimatable, animation: Animation) => void): Promise<void> | null {
        return loadBabylonAssetAnimationChannel(this._loader, this.assetModel, context, animationContext, animation, channel, onLoad);
    }

    public async loadMaterialPropertiesAsync(context: string, material: any, babylonMaterial: Material): Promise<void> {
        await this._loader.loadMaterialPropertiesAsync(context, material, babylonMaterial);
        if (!(babylonMaterial instanceof PBRMaterial)) {
            return;
        }

        const transmission = material.extensions?.KHR_materials_transmission;
        if (transmission?.transmissionTexture && babylonMaterial.subSurface.refractionIntensityTexture == null) {
            transmission.transmissionTexture.nonColorData = true;
            await this._loader.loadTextureInfoAsync(
                `${context}/extensions/KHR_materials_transmission/transmissionTexture`,
                transmission.transmissionTexture,
                (texture: any) => {
                    texture.name = `${babylonMaterial.name} (Transmission)`;
                    babylonMaterial.subSurface.refractionIntensityTexture = texture;
                    babylonMaterial.subSurface.useGltfStyleTextures = true;
                },
            );
        }

        const volume = material.extensions?.KHR_materials_volume;
        if (volume?.thicknessTexture && babylonMaterial.subSurface.thicknessTexture == null) {
            volume.thicknessTexture.nonColorData = true;
            await this._loader.loadTextureInfoAsync(
                `${context}/extensions/KHR_materials_volume/thicknessTexture`,
                volume.thicknessTexture,
                (texture: any) => {
                    texture.name = `${babylonMaterial.name} (Thickness)`;
                    babylonMaterial.subSurface.thicknessTexture = texture;
                    babylonMaterial.subSurface.useGltfStyleTextures = true;
                },
            );
        }
    }
}
