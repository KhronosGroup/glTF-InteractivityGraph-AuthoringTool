import {ADecorator} from "../BasicBehaveEngine/ADecorator";
import {BehaveEngineNode} from "../BasicBehaveEngine/BehaveEngineNode";
import {IBehaveEngine, IJsonPtrEntry} from "../BasicBehaveEngine/IBehaveEngine";
import {
    AbstractMesh,
    AnimationGroup, Camera, Color3,
    float,
    Matrix, PBRMaterial,
    PointerEventTypes,
    Node,
    TransformNode,
    Material,
    Observer,
    PointerInfo,
    Light,
    SpotLight
} from "@babylonjs/core";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Scene} from "@babylonjs/core/scene";
import {KHR_materials_variants} from "@babylonjs/loaders/glTF/2.0";
import {Nullable} from "@babylonjs/core/types.js";
import { IInteractivityFlow } from "../BasicBehaveEngine/types/InteractivityGraph";
import {glTFObjectReference} from "../objectModel/glTFReference";
import {SUPPORTED_GLTF_EXTENSIONS} from "../diagnostics";
import {ASSET_EXTENSION_ENABLED_POINTER, assetExtensionEnabled, KHR_INTERACTIVITY_LIMITS, parseGltfVersion} from "../objectModel/assetCapabilities";
import {effectiveAnimationTime} from "../objectModel/glTFAnimation";
import {registerBabylonCameraPointers} from "./babylonCameraPointers";
import {createBabylonAssetNodePointers} from "./babylonAssetPointers";
import {BabylonAssetModel} from "../components/engineViews/babylonAssetModel";
import {createBabylonRuntimeAssetModel} from "../components/engineViews/babylonLoadedModel";

export class BabylonDecorator extends ADecorator {
    scene: Scene;
    world: any;
    hoveredNode: any;
    hoveredNodeIndex: number;
    private readonly nodeModel: BabylonAssetModel;
    private beforeRenderObserver: Observer<Scene> | null = null;
    private pointerObserver: Observer<PointerInfo> | null = null;

    constructor(behaveEngine: IBehaveEngine, world: any, scene: Scene) {
        super(behaveEngine);
        this.world = world;
        this.nodeModel = world.assetModel ?? createBabylonRuntimeAssetModel(world.glTFNodes, scene);
        this.scene = scene;
        this.bridgeEngineHooks();
        this.registerKnownPointers();
        this.bridgeReferencePointers();
        this.bridgeAssetNodePointers();
        // dealing with hoverability refactor this once/if babylon has an api for hoverability
        this.hoveredNodeIndex = -1;
        this.beforeRenderObserver = this.scene.onBeforeRenderObservable.add(() => {
            const ray = this.scene.createPickingRay(
                this.scene.pointerX,
                this.scene.pointerY,
                Matrix.Identity(),
                this.scene.activeCamera,
            );
            const result = this.scene.pickWithRay(ray, (m) => m.metadata == null || m.metadata.compositeHoverability != false);
            let hitNodeIndex : number | undefined = undefined;
            if (result && result.pickedMesh) {
                hitNodeIndex = this.getGlTFNodeIndexForBabylonNode(result.pickedMesh);
            }
            this.hoverOn(hitNodeIndex, 0);
        });

        this.pointerObserver = this.scene.onPointerObservable.add(async (pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERPICK) {
                const ray = this.scene.createPickingRay(
                    this.scene.pointerX,
                    this.scene.pointerY,
                    Matrix.Identity(),
                    this.scene.activeCamera,
                );

                const hit = this.scene.pickWithRay(ray);
                if (hit == null || hit.pickedMesh == null) {
                    return;
                }
                let pos : [number, number, number] = [hit.pickedMesh.position.x, hit.pickedMesh.position.y, hit.pickedMesh.position.z];
                    if (hit.pickedPoint != null) {
                        pos = BabylonDecorator.toRightHandedXYZ(hit.pickedPoint.x, hit.pickedPoint.y, hit.pickedPoint.z);
                    }
                const hitNodeIndex = this.getGlTFNodeIndexForBabylonNode(hit.pickedMesh);
                if (hitNodeIndex === undefined) {
                    return;
                }
                this.select(hitNodeIndex, 0, pos, BabylonDecorator.toRightHandedXYZ(ray.origin.x, ray.origin.y, ray.origin.z));
            }
        });

        // setting all nodes to inherit visibility (defualt in KHR_interactivity's opinion)
        for (const node of this.world.glTFNodes) {
            if (node) node.inheritVisibility = true;
        }
    }

    /** Babylon.js is left-handed; glTF/KHR_interactivity is right-handed, so X is negated. */
    private static toRightHandedXYZ(x: number, y: number, z: number): [number, number, number] {
        return [-x, y, z];
    }

    // Asset extension `enabled` capability pointers (spec 4.2.1) are valid for ANY extension name,
    // returning true when the extension is used+supported and false otherwise. The JsonPtrTrie only
    // wildcards numeric segments, so we wrap the engine's pointer resolution to answer these queries
    // before falling back to the trie. Mirrors the concrete pointers registered above.
    private bridgeAssetCapabilityPointers(extensionsUsed: readonly string[]): void {
        const engine = this.behaveEngine;
        const baseResolveJsonPtr = engine.resolveJsonPtr;
        engine.resolveJsonPtr = (path: string) =>
            assetExtensionEnabled(path, extensionsUsed) !== undefined ? ASSET_EXTENSION_ENABLED_POINTER : baseResolveJsonPtr(path);
    }

    private bridgeReferencePointers(): void {
        const engine = this.behaveEngine;
        const baseResolveJsonPtr = engine.resolveJsonPtr;
        engine.resolveJsonPtr = (path: string) => {
            const entry = baseResolveJsonPtr(path);
            return entry?.typeName === "ref" && entry.getValue(path) === undefined ? undefined : entry;
        };
    }

    private bridgeCameraPointers(): void {
        const bindings = new Map<string, IJsonPtrEntry>();
        registerBabylonCameraPointers(this.scene, (path, type, get, set, readOnly = false) => {
            bindings.set(path, { typeName: type, readOnly, getValue: get, setValue: (_path, value) => set?.(value) });
            this.registerJsonPointer(path, get, (_path, value) => set?.(value), type, readOnly);
        }, this.world.assetModel);
        const engine = this.behaveEngine;
        const baseResolveJsonPtr = engine.resolveJsonPtr;
        // JsonPtrTrie treats numeric segments as wildcards. Concrete camera
        // bindings must remain isolated and absent optional fields stay absent.
        engine.resolveJsonPtr = (path: string) =>
            path.startsWith("/cameras/") || path.startsWith("/extensions/KHR_interactivity/activeCamera/") ? bindings.get(path) : baseResolveJsonPtr(path);
    }

    private bridgeAssetNodePointers(): void {
        const bindings = createBabylonAssetNodePointers(this.nodeModel);
        const engine = this.behaveEngine;
        const resolve = engine.resolveJsonPtr;
        const registered = engine.getRegisteredJsonPointers;
        engine.resolveJsonPtr = path => path.startsWith("/nodes/") || path === "/nodes.length" ? bindings.get(path) : resolve(path);
        engine.getRegisteredJsonPointers = () => [...registered(), ...bindings.keys()].sort();
    }

    // KHR_texture_transform rotation is negated by Babylon's glTF loader/exporter convention, see
    // https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/loaders/src/glTF/2.0/Extensions/KHR_texture_transform.ts#L73
    private static getTextureRotation(texture: {wAng: number} | null | undefined): [number] {
        return texture == null ? [NaN] : [-1 * texture.wAng];
    }

    private static setTextureRotation(texture: {wAng: number} | null | undefined, value: number): void {
        if (texture != null) {
            texture.wAng = -1 * value;
        }
    }

    private registerMaterialTextureCoordinatePointers(maxMaterialIndex: number): void {
        const bindings: Array<{ path: string; select: (material: PBRMaterial) => any }> = [
            { path: "emissiveTexture", select: (material) => material.emissiveTexture },
            { path: "normalTexture", select: (material) => material.bumpTexture },
            { path: "occlusionTexture", select: (material) => material.ambientTexture },
            { path: "pbrMetallicRoughness/baseColorTexture", select: (material) => material.albedoTexture },
            { path: "pbrMetallicRoughness/metallicRoughnessTexture", select: (material) => material.metallicTexture },
            { path: "extensions/KHR_materials_anisotropy/anisotropyTexture", select: (material) => material.anisotropy.texture },
            { path: "extensions/KHR_materials_clearcoat/clearcoatTexture", select: (material) => material.clearCoat.texture },
            { path: "extensions/KHR_materials_clearcoat/clearcoatRoughnessTexture", select: (material) => material.clearCoat.textureRoughness },
            { path: "extensions/KHR_materials_clearcoat/clearcoatNormalTexture", select: (material) => material.clearCoat.bumpTexture },
            { path: "extensions/KHR_materials_iridescence/iridescenceTexture", select: (material) => material.iridescence.texture },
            { path: "extensions/KHR_materials_iridescence/iridescenceThicknessTexture", select: (material) => material.iridescence.thicknessTexture },
            { path: "extensions/KHR_materials_sheen/sheenColorTexture", select: (material) => material.sheen.texture },
            { path: "extensions/KHR_materials_sheen/sheenRoughnessTexture", select: (material) => material.sheen.textureRoughness },
            { path: "extensions/KHR_materials_specular/specularTexture", select: (material) => material.metallicReflectanceTexture },
            { path: "extensions/KHR_materials_specular/specularColorTexture", select: (material) => material.reflectanceTexture },
            { path: "extensions/KHR_materials_transmission/transmissionTexture", select: (material) => material.subSurface.refractionIntensityTexture },
            { path: "extensions/KHR_materials_volume/thicknessTexture", select: (material) => material.subSurface.thicknessTexture },
        ];

        for (const binding of bindings) {
            this.registerJsonPointer(`/materials/${maxMaterialIndex}/${binding.path}/texCoord`, (path) => {
                const texture = binding.select(this.world.materials[Number(path.split("/")[2])] as PBRMaterial);
                return texture == null ? [NaN] : [texture.coordinatesIndex];
            }, (path, value) => {
                const texture = binding.select(this.world.materials[Number(path.split("/")[2])] as PBRMaterial);
                if (texture != null) {
                    texture.coordinatesIndex = Array.isArray(value) ? value[0] : value;
                }
            }, "int", false);
        }
    }

    private registerClearcoatNormalTexturePointers(maxMaterialIndex: number): void {
        const pointer = `/materials/${maxMaterialIndex}/extensions/KHR_materials_clearcoat/clearcoatNormalTexture`;
        const select = (path: string): any => (this.world.materials[Number(path.split("/")[2])] as PBRMaterial).clearCoat.bumpTexture;

        this.registerJsonPointer(`${pointer}/scale`, (path) => {
            const texture = select(path);
            return texture == null ? [NaN] : [texture.level];
        }, (path, value) => {
            const texture = select(path);
            if (texture != null) {
                texture.level = Array.isArray(value) ? value[0] : value;
            }
        }, "float", false);

        const transform = `${pointer}/extensions/KHR_texture_transform`;
        this.registerJsonPointer(`${transform}/offset`, (path) => {
            const texture = select(path);
            return texture == null ? [NaN, NaN] : [texture.uOffset, texture.vOffset];
        }, (path, value) => {
            const texture = select(path);
            if (texture != null) {
                texture.uOffset = value[0];
                texture.vOffset = value[1];
            }
        }, "float2", false);
        this.registerJsonPointer(`${transform}/scale`, (path) => {
            const texture = select(path);
            return texture == null ? [NaN, NaN] : [texture.uScale, texture.vScale];
        }, (path, value) => {
            const texture = select(path);
            if (texture != null) {
                texture.uScale = value[0];
                texture.vScale = value[1];
            }
        }, "float2", false);
        this.registerJsonPointer(`${transform}/rotation`, (path) => BabylonDecorator.getTextureRotation(select(path)), (path, value) => {
            BabylonDecorator.setTextureRotation(select(path), Array.isArray(value) ? value[0] : value);
        }, "float", false);
    }

    public dispose(): void {
        if (this.beforeRenderObserver != null) {
            this.scene.onBeforeRenderObservable.remove(this.beforeRenderObserver);
            this.beforeRenderObserver = null;
        }
        if (this.pointerObserver != null) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        super.dispose();
    }

    processAddingNodeToQueue = (flow: IInteractivityFlow) => {
        //pass
    }

    processExecutingNextNode = (flow: IInteractivityFlow) => {
        //pass
    }

    processNodeStarted = (node: BehaveEngineNode) => {
        //pass
    }

    getWorld = (): any => {
        return this.world;
    }

    getParentNodeIndex = (nodeIndex: number) => {
        return this.nodeModel.nodes[nodeIndex]?.parent;
    }

    private getGlTFNodeIndexForBabylonNode(node: Node | null | undefined): number | undefined {
        let currentNode: Node | null | undefined = node;
        while (currentNode != null) {
            const metadataNodeIndex = currentNode.metadata?.nodeIndex;
            if (Number.isInteger(metadataNodeIndex) && (!this.world.assetModel || this.world.glTFNodes[metadataNodeIndex] === currentNode || this.world.assetModel.nodes[metadataNodeIndex]?.meshes.includes(currentNode))) {
                return metadataNodeIndex;
            }

            const nodeIndex = this.world.glTFNodes.findIndex((value: { uniqueId: number; }) => value?.uniqueId === currentNode!.uniqueId);
            if (nodeIndex !== -1) {
                return nodeIndex;
            }

            currentNode = currentNode.parent;
        }
        return undefined;
    }

    public loadBehaveGraphFromRootNode(rootNode: TransformNode): void {
        if (rootNode.metadata === undefined || rootNode.metadata['behaveGraph'] === undefined) {
            console.info('No behavior found in root node');
            return;
        }

        const behaveGraph = rootNode.metadata['behaveGraph'];
        this.loadBehaveGraph(behaveGraph);
    }

    registerKnownPointers = () => {
        const gltf = this.world.assetModel?.structure ?? this.scene.metadata?.gltfStructure;
        const reference = (category: string, index: number | undefined): string[] | undefined =>
            index === undefined || index < 0 ? undefined : [glTFObjectReference(category, index)];
        const maxGlTFMaterials: number = this.world.materials.length-1;
        const maxAnimations: number = this.world.animations.length-1;

        // Babylon's glTF loader tags every object it creates from a glTF property with the
        // originating JSON pointer in `_internalMetadata.gltf.pointers`. `this.world.meshes` holds
        // one Babylon Mesh *per glTF primitive* (tagged `/meshes/{m}/primitives/{p}`), not one per
        // glTF mesh definition, so glTF mesh indices/counts have to be derived from those pointers
        // rather than from array position/length.
        const meshPrimitivePointerRegex = /^\/meshes\/(\d+)\/primitives\/(\d+)$/;
        const glTFMeshPrimitives: {meshIndex: number, primitiveIndex: number, babylonMesh: any}[] = [];
        for (const m of this.world.meshes) {
            const pointer = m._internalMetadata?.gltf?.pointers?.find((p: string) => meshPrimitivePointerRegex.test(p));
            if (pointer !== undefined) {
                const match = pointer.match(meshPrimitivePointerRegex)!;
                glTFMeshPrimitives.push({meshIndex: Number(match[1]), primitiveIndex: Number(match[2]), babylonMesh: m});
            }
        }
        const maxGlTFMeshIndex: number = Math.max(0, (gltf?.meshes?.length ?? 0) - 1, ...glTFMeshPrimitives.map(p => p.meshIndex));
        const maxMeshPrimitiveIndex: number = Math.max(0,
            ...(gltf?.meshes ?? []).map((mesh: { primitives: unknown[] }) => mesh.primitives.length - 1),
            ...glTFMeshPrimitives.map(p => p.primitiveIndex));
        const getMeshPrimitives = (meshIndex: number) => glTFMeshPrimitives
            .filter(p => p.meshIndex === meshIndex)
            .sort((a, b) => a.primitiveIndex - b.primitiveIndex);

        const cameraPointerRegex = /^\/cameras\/\d+$/;
        const glTFCameras = this.scene.cameras
            .filter((c: any) => c._internalMetadata?.gltf?.pointers?.some((p: string) => cameraPointerRegex.test(p)))
            .sort((a: any, b: any) => {
                const aIndex = Number(a._internalMetadata.gltf.pointers.find((p: string) => cameraPointerRegex.test(p)).split("/").pop());
                const bIndex = Number(b._internalMetadata.gltf.pointers.find((p: string) => cameraPointerRegex.test(p)).split("/").pop());
                return aIndex - bIndex;
            });

        // Babylon's glTF loader does not tag Skeleton objects with `_internalMetadata.gltf.pointers`
        // (AddPointerMetadata is only called for transform nodes/meshes/cameras/materials/textures).
        // Instead it names every skeleton it creates from a glTF skin `skeleton{skinIndex}` (see
        // GLTFLoader._loadSkinAsync), so the glTF skin index is recovered from the Babylon skeleton id.
        const skeletonIdRegex = /^skeleton(\d+)$/;
        const getSkinIndexForSkeleton = (skeleton: any): number | undefined => {
            const match = skeletonIdRegex.exec(skeleton.id);
            return match === null ? undefined : Number(match[1]);
        };
        const glTFSkeletons = this.scene.skeletons
            .filter((s: any) => getSkinIndexForSkeleton(s) !== undefined)
            .sort((a: any, b: any) => getSkinIndexForSkeleton(a)! - getSkinIndexForSkeleton(b)!);
        // Babylon adds a Bone for every ancestor between a joint and the skin's skeleton root, not
        // just the actual joints (GLTFLoader._loadBone recurses up the parent chain). Those extra
        // ancestor-only bones get boneIndex -1 (skin.joints.indexOf(node.index) miss), so they must
        // be filtered out and the rest ordered by boneIndex to match glTF's `skin.joints` order.
        const getSkeletonJointNodeIndices = (skeleton: any): number[] => skeleton.bones
            .filter((bone: any) => bone.getIndex() !== -1)
            .sort((a: any, b: any) => a.getIndex() - b.getIndex())
            .map((bone: any) => bone.getTransformNode()?.metadata?.nodeIndex)
            .filter((idx: number | undefined) => idx !== undefined);
        const getSkeleton = (skinIndex: number) => glTFSkeletons.find(skeleton => getSkinIndexForSkeleton(skeleton) === skinIndex);

        const rootLevelNodeIndices = this.world.glTFNodes
            .map((_: any, idx: number) => idx)
            .filter((idx: number) => this.getParentNodeIndex(idx) === undefined);

        this.bridgeCameraPointers();

        // Asset Capabilities & runtime limits (KHR_interactivity spec 4.2.1 / 4.2.2): read-only glTF
        // version, per-extension support flags, and implementation limits. Extensions that are BOTH
        // used by the asset AND supported get a concrete `enabled` = true pointer (so authoring can
        // surface them); for every other extension the pointer does not exist (see
        // assetExtensionEnabled, bridged in bridgeAssetCapabilityPointers()).
        const [assetMajorVersion, assetMinorVersion] = parseGltfVersion(this.world.assetModel?.asset.version ?? this.scene.metadata?.gltfAsset?.version);
        this.registerJsonPointer(`/extensions/KHR_interactivity/asset/majorVersion`, () => {
            return [assetMajorVersion];
        }, () => {/*no-op*/}, "int", true);
        this.registerJsonPointer(`/extensions/KHR_interactivity/asset/minorVersion`, () => {
            return [assetMinorVersion];
        }, () => {/*no-op*/}, "int", true);
        const extensionsUsed: string[] = this.world.assetModel?.extensionsUsed ?? this.scene.metadata?.gltfExtensionsUsed ?? [];
        for (const extensionName of extensionsUsed) {
            if (!SUPPORTED_GLTF_EXTENSIONS.has(extensionName)) {
                continue;
            }
            this.registerJsonPointer(`/extensions/KHR_interactivity/asset/extensions/${extensionName}/enabled`, () => {
                return [true];
            }, () => {/*no-op*/}, "bool", true);
        }
        for (const { name, value } of KHR_INTERACTIVITY_LIMITS) {
            this.registerJsonPointer(`/extensions/KHR_interactivity/limits/${name}`, () => {
                return [value];
            }, () => {/*no-op*/}, "int", true);
        }
        this.bridgeAssetCapabilityPointers(extensionsUsed);

        //TODO: update to match what object model has once that is published
        this.registerJsonPointer(`/KHR_materials_variants/variant`, (path) => {
            let root = this.world.glTFNodes.find((node: Node | undefined) => node !== undefined);
            while (root.parent) {
                root = root.parent;
            }
            const variants = KHR_materials_variants.GetAvailableVariants(root);
            const selectedVariant = KHR_materials_variants.GetLastSelectedVariant(root);
            return [variants.indexOf(selectedVariant as string)];
        }, (path, value) => {
            let root = this.world.glTFNodes.find((node: Node | undefined) => node !== undefined);
            while (root.parent) {
                root = root.parent;
            }
            const variants = KHR_materials_variants.GetAvailableVariants(root);
            KHR_materials_variants.SelectVariant(root, variants[value]);
        }, "int", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/baseColorFactor`, (path) => {
            const parts: string[] = path.split("/");
            const baseColor = (this.world.materials[Number(parts[2])] as PBRMaterial).albedoColor;
            const baseColorAlpha = (this.world.materials[Number(parts[2])] as PBRMaterial).alpha
            return (baseColor === null || baseColorAlpha == null)? [NaN, NaN, NaN, NaN] : [baseColor.r, baseColor.g, baseColor.b, baseColorAlpha];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as PBRMaterial;
            material.albedoColor = new Color3(value[0], value[1], value[2]);
            material.alpha = value[3];
        }, "float4", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/roughnessFactor`, (path) => {
            const parts: string[] = path.split("/");
            const roughness = (this.world.materials[Number(parts[2])] as PBRMaterial).roughness;
            return roughness === null ? [NaN] : [roughness];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as PBRMaterial;
            material.roughness = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/metallicFactor`, (path) => {
            const parts: string[] = path.split("/");
            const metallic = (this.world.materials[Number(parts[2])] as PBRMaterial).metallic;
            return metallic === null ? [NaN] : [metallic];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as PBRMaterial;
            material.metallic = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/alphaCutoff`, (path) => {
            const parts: string[] = path.split("/");
            const alphaCutoff = (this.world.materials[Number(parts[2])]).alphaCutoff;
            return alphaCutoff === null ? [NaN] : [alphaCutoff];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])];
            material.alphaCutoff = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/doubleSided`, (path) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as Material;
            return [material.backFaceCulling === false];
        }, () => {/* read-only */}, "bool", true);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/emissiveFactor`, (path) => {
            const parts: string[] = path.split("/");
            const emissiveFactor = (this.world.materials[Number(parts[2])]).emissiveFactor;
            return emissiveFactor === undefined ? [NaN, NaN, NaN] : [emissiveFactor[0], emissiveFactor[1], emissiveFactor[2]];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])];
            material.emissiveFactor = value;
        }, "float3", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/normalTexture/scale`, (path) => {
            const parts: string[] = path.split("/");
            const bumpTexture = (this.world.materials[Number(parts[2])] as PBRMaterial).bumpTexture;
            return bumpTexture === null ? [NaN] : [bumpTexture.level];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as PBRMaterial;
            if (material.bumpTexture) {
                material.bumpTexture.level = value;
            }
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/occlusionTexture/strength`, (path) => {
            const parts: string[] = path.split("/");
            const ambientTextureStrength = (this.world.materials[Number(parts[2])] as PBRMaterial).ambientTextureStrength;
            return ambientTextureStrength === null ? [NaN] : [ambientTextureStrength];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as PBRMaterial;
            material.ambientTextureStrength = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_emissive_strength/emissiveStrength`, (path) => {
            const parts: string[] = path.split("/");
            const emissiveStrength = (this.world.materials[Number(parts[2])]).emissiveIntensity;
            return emissiveStrength === undefined ? [NaN] : [emissiveStrength];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])];
            material.emissiveIntensity = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_transmission/transmissionFactor`, (path) => {
            const parts: string[] = path.split("/");
            const transmissionFactor = (this.world.materials[Number(parts[2])] as PBRMaterial).subSurface.refractionIntensity;
            return transmissionFactor === undefined ? [NaN] : [transmissionFactor];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])];
            material.subSurface.refractionIntensity = value;
        }, "float", false);

        // TRANSMISSION TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_transmission/transmissionTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const transmissionTexture = this.world.materials[Number(parts[2])].subSurface.refractionIntensityTexture;
            if (transmissionTexture == null) {
                return [NaN, NaN];
            }
            return [transmissionTexture.uOffset, transmissionTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const transmissionTexture = this.world.materials[Number(parts[2])].subSurface.refractionIntensityTexture;
            if (transmissionTexture != null) {
                transmissionTexture.uOffset = value[0];
                transmissionTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_transmission/transmissionTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const transmissionTexture = this.world.materials[Number(parts[2])].subSurface.refractionIntensityTexture;
            if (transmissionTexture == null) {
                return [NaN, NaN];
            }
            return [transmissionTexture.uScale, transmissionTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const transmissionTexture = this.world.materials[Number(parts[2])].subSurface.refractionIntensityTexture;
            if (transmissionTexture != null) {
                transmissionTexture.uScale = value[0];
                transmissionTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_transmission/transmissionTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const transmissionTexture = this.world.materials[Number(parts[2])].subSurface.refractionIntensityTexture;
            return BabylonDecorator.getTextureRotation(transmissionTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const transmissionTexture = this.world.materials[Number(parts[2])].subSurface.refractionIntensityTexture;
            BabylonDecorator.setTextureRotation(transmissionTexture, value);
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_ior/ior`, (path) => {
            const parts: string[] = path.split("/");
            const ior = (this.world.materials[Number(parts[2])] as PBRMaterial).indexOfRefraction;
            return ior === undefined ? [NaN] : [ior];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.materials[Number(parts[2])] as PBRMaterial).indexOfRefraction = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_volume/thicknessFactor`, (path) => {
            const parts: string[] = path.split("/");
            const thickness = (this.world.materials[Number(parts[2])] as PBRMaterial).subSurface.maximumThickness;
            return thickness === undefined ? [NaN] : [thickness];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.materials[Number(parts[2])] as PBRMaterial).subSurface.maximumThickness = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_volume/attenuationColor`, (path) => {
            const parts: string[] = path.split("/");
            const tintColor = (this.world.materials[Number(parts[2])] as PBRMaterial).subSurface.tintColor;
            return tintColor === undefined ? [NaN, NaN, NaN] : [tintColor.r, tintColor.g, tintColor.b];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.materials[Number(parts[2])] as PBRMaterial).subSurface.tintColor = new Color3(value[0], value[1], value[2]);
        }, "float3", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_volume/attenuationDistance`, (path) => {
            const parts: string[] = path.split("/");
            const tintColorAtDistance = this.world.materials[Number(parts[2])].subSurface.tintColorAtDistance;
            return tintColorAtDistance === undefined ? [NaN] : [tintColorAtDistance];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            this.world.materials[Number(parts[2])].subSurface.tintColorAtDistance = value;
        }, "float", false);

        // THICKNESS TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_volume/thicknessTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const thicknessTexture = this.world.materials[Number(parts[2])].subSurface.thicknessTexture;
            if (thicknessTexture == null) {
                return [NaN, NaN];
            }
            return [thicknessTexture.uOffset, thicknessTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const thicknessTexture = this.world.materials[Number(parts[2])].subSurface.thicknessTexture;
            if (thicknessTexture != null) {
                thicknessTexture.uOffset = value[0];
                thicknessTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_volume/thicknessTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const thicknessTexture = this.world.materials[Number(parts[2])].subSurface.thicknessTexture;
            if (thicknessTexture == null) {
                return [NaN, NaN];
            }
            return [thicknessTexture.uScale, thicknessTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const thicknessTexture = this.world.materials[Number(parts[2])].subSurface.thicknessTexture;
            if (thicknessTexture != null) {
                thicknessTexture.uScale = value[0];
                thicknessTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_volume/thicknessTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const thicknessTexture = this.world.materials[Number(parts[2])].subSurface.thicknessTexture;
            return BabylonDecorator.getTextureRotation(thicknessTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const thicknessTexture = this.world.materials[Number(parts[2])].subSurface.thicknessTexture;
            BabylonDecorator.setTextureRotation(thicknessTexture, value);
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_dispersion/dispersion`, (path) => {
            const parts: string[] = path.split("/");
            const dispersion = this.world.materials[Number(parts[2])].subSurface.dispersion;
            return dispersion === undefined ? [NaN] : [dispersion];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            this.world.materials[Number(parts[2])].subSurface.dispersion = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_specular/specularFactor`, (path) => {
            const parts: string[] = path.split("/");
            const specularFactor = (this.world.materials[Number(parts[2])] as PBRMaterial).metallicF0Factor;
            return specularFactor === undefined ? [NaN] : [specularFactor];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.materials[Number(parts[2])] as PBRMaterial).metallicF0Factor = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_specular/specularColorFactor`, (path) => {
            const parts: string[] = path.split("/");
            const specularColor = (this.world.materials[Number(parts[2])] as PBRMaterial).metallicReflectanceColor;
            return specularColor === undefined ? [NaN, NaN, NaN] : [specularColor.r, specularColor.g, specularColor.b];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.materials[Number(parts[2])] as PBRMaterial).metallicReflectanceColor = new Color3(value[0], value[1], value[2]);
        }, "float3", false);

        // SPECULAR TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_specular/specularTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const specularTexture = this.world.materials[Number(parts[2])].metallicReflectanceTexture;
            if (specularTexture == null) {
                return [NaN, NaN];
            }
            return [specularTexture.uOffset, specularTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const specularTexture = this.world.materials[Number(parts[2])].metallicReflectanceTexture;
            if (specularTexture != null) {
                specularTexture.uOffset = value[0];
                specularTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_specular/specularTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const specularTexture = this.world.materials[Number(parts[2])].metallicReflectanceTexture;
            if (specularTexture == null) {
                return [NaN, NaN];
            }
            return [specularTexture.uScale, specularTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const specularTexture = this.world.materials[Number(parts[2])].metallicReflectanceTexture;
            if (specularTexture != null) {
                specularTexture.uScale = value[0];
                specularTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_specular/specularTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const specularTexture = this.world.materials[Number(parts[2])].metallicReflectanceTexture;
            return BabylonDecorator.getTextureRotation(specularTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const specularTexture = this.world.materials[Number(parts[2])].metallicReflectanceTexture;
            BabylonDecorator.setTextureRotation(specularTexture, value);
        }, "float", false);

        // SPECULAR COLOR TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_specular/specularColorTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const specularColorTexture = this.world.materials[Number(parts[2])].reflectanceTexture;
            if (specularColorTexture == null) {
                return [NaN, NaN];
            }
            return [specularColorTexture.uOffset, specularColorTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const specularColorTexture = this.world.materials[Number(parts[2])].reflectanceTexture;
            if (specularColorTexture != null) {
                specularColorTexture.uOffset = value[0];
                specularColorTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_specular/specularColorTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const specularColorTexture = this.world.materials[Number(parts[2])].reflectanceTexture;
            if (specularColorTexture == null) {
                return [NaN, NaN];
            }
            return [specularColorTexture.uScale, specularColorTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const specularColorTexture = this.world.materials[Number(parts[2])].reflectanceTexture;
            if (specularColorTexture != null) {
                specularColorTexture.uScale = value[0];
                specularColorTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_specular/specularColorTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const specularColorTexture = this.world.materials[Number(parts[2])].reflectanceTexture;
            return BabylonDecorator.getTextureRotation(specularColorTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const specularColorTexture = this.world.materials[Number(parts[2])].reflectanceTexture;
            BabylonDecorator.setTextureRotation(specularColorTexture, value);
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_sheen/sheenColorFactor`, (path) => {
            const parts: string[] = path.split("/");
            const sheenColor = (this.world.materials[Number(parts[2])] as PBRMaterial).sheen.color;
            return sheenColor === undefined ? [NaN, NaN, NaN] : [sheenColor.r, sheenColor.g, sheenColor.b];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const sheen = (this.world.materials[Number(parts[2])] as PBRMaterial).sheen;
            sheen.isEnabled = true;
            sheen.color = new Color3(value[0], value[1], value[2]);
        }, "float3", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_sheen/sheenRoughnessFactor`, (path) => {
            const parts: string[] = path.split("/");
            const sheenRoughness = (this.world.materials[Number(parts[2])] as PBRMaterial).sheen.roughness;
            return sheenRoughness === undefined || sheenRoughness === null ? [NaN] : [sheenRoughness];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const sheen = (this.world.materials[Number(parts[2])] as PBRMaterial).sheen;
            sheen.isEnabled = true;
            sheen.roughness = value;
        }, "float", false);

        // SHEEN COLOR TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_sheen/sheenColorTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const sheenColorTexture = this.world.materials[Number(parts[2])].sheen.texture;
            if (sheenColorTexture == null) {
                return [NaN, NaN];
            }
            return [sheenColorTexture.uOffset, sheenColorTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const sheenColorTexture = this.world.materials[Number(parts[2])].sheen.texture;
            if (sheenColorTexture != null) {
                sheenColorTexture.uOffset = value[0];
                sheenColorTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_sheen/sheenColorTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const sheenColorTexture = this.world.materials[Number(parts[2])].sheen.texture;
            if (sheenColorTexture == null) {
                return [NaN, NaN];
            }
            return [sheenColorTexture.uScale, sheenColorTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const sheenColorTexture = this.world.materials[Number(parts[2])].sheen.texture;
            if (sheenColorTexture != null) {
                sheenColorTexture.uScale = value[0];
                sheenColorTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_sheen/sheenColorTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const sheenColorTexture = this.world.materials[Number(parts[2])].sheen.texture;
            return BabylonDecorator.getTextureRotation(sheenColorTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const sheenColorTexture = this.world.materials[Number(parts[2])].sheen.texture;
            BabylonDecorator.setTextureRotation(sheenColorTexture, value);
        }, "float", false);

        // SHEEN ROUGHNESS TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_sheen/sheenRoughnessTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const sheenRoughnessTexture = this.world.materials[Number(parts[2])].sheen.textureRoughness;
            if (sheenRoughnessTexture == null) {
                return [NaN, NaN];
            }
            return [sheenRoughnessTexture.uOffset, sheenRoughnessTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const sheenRoughnessTexture = this.world.materials[Number(parts[2])].sheen.textureRoughness;
            if (sheenRoughnessTexture != null) {
                sheenRoughnessTexture.uOffset = value[0];
                sheenRoughnessTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_sheen/sheenRoughnessTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const sheenRoughnessTexture = this.world.materials[Number(parts[2])].sheen.textureRoughness;
            if (sheenRoughnessTexture == null) {
                return [NaN, NaN];
            }
            return [sheenRoughnessTexture.uScale, sheenRoughnessTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const sheenRoughnessTexture = this.world.materials[Number(parts[2])].sheen.textureRoughness;
            if (sheenRoughnessTexture != null) {
                sheenRoughnessTexture.uScale = value[0];
                sheenRoughnessTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_sheen/sheenRoughnessTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const sheenRoughnessTexture = this.world.materials[Number(parts[2])].sheen.textureRoughness;
            return BabylonDecorator.getTextureRotation(sheenRoughnessTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const sheenRoughnessTexture = this.world.materials[Number(parts[2])].sheen.textureRoughness;
            BabylonDecorator.setTextureRotation(sheenRoughnessTexture, value);
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_clearcoat/clearcoatFactor`, (path) => {
            const parts: string[] = path.split("/");
            const clearcoat = (this.world.materials[Number(parts[2])] as PBRMaterial).clearCoat.intensity;
            return clearcoat === undefined ? [NaN] : [clearcoat];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const clearCoat = (this.world.materials[Number(parts[2])] as PBRMaterial).clearCoat;
            clearCoat.isEnabled = true;
            clearCoat.intensity = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_clearcoat/clearcoatRoughnessFactor`, (path) => {
            const parts: string[] = path.split("/");
            const clearcoatRoughness = (this.world.materials[Number(parts[2])] as PBRMaterial).clearCoat.roughness;
            return clearcoatRoughness === undefined ? [NaN] : [clearcoatRoughness];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const clearCoat = (this.world.materials[Number(parts[2])] as PBRMaterial).clearCoat;
            clearCoat.isEnabled = true;
            clearCoat.roughness = value;
        }, "float", false);

        // CLEARCOAT TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_clearcoat/clearcoatTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const clearcoatTexture = this.world.materials[Number(parts[2])].clearCoat.texture;
            if (clearcoatTexture == null) {
                return [NaN, NaN];
            }
            return [clearcoatTexture.uOffset, clearcoatTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const clearcoatTexture = this.world.materials[Number(parts[2])].clearCoat.texture;
            if (clearcoatTexture != null) {
                clearcoatTexture.uOffset = value[0];
                clearcoatTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_clearcoat/clearcoatTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const clearcoatTexture = this.world.materials[Number(parts[2])].clearCoat.texture;
            if (clearcoatTexture == null) {
                return [NaN, NaN];
            }
            return [clearcoatTexture.uScale, clearcoatTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const clearcoatTexture = this.world.materials[Number(parts[2])].clearCoat.texture;
            if (clearcoatTexture != null) {
                clearcoatTexture.uScale = value[0];
                clearcoatTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_clearcoat/clearcoatTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const clearcoatTexture = this.world.materials[Number(parts[2])].clearCoat.texture;
            return BabylonDecorator.getTextureRotation(clearcoatTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const clearcoatTexture = this.world.materials[Number(parts[2])].clearCoat.texture;
            BabylonDecorator.setTextureRotation(clearcoatTexture, value);
        }, "float", false);

        // CLEARCOAT ROUGHNESS TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_clearcoat/clearcoatRoughnessTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const clearcoatRoughnessTexture = this.world.materials[Number(parts[2])].clearCoat.textureRoughness;
            if (clearcoatRoughnessTexture == null) {
                return [NaN, NaN];
            }
            return [clearcoatRoughnessTexture.uOffset, clearcoatRoughnessTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const clearcoatRoughnessTexture = this.world.materials[Number(parts[2])].clearCoat.textureRoughness;
            if (clearcoatRoughnessTexture != null) {
                clearcoatRoughnessTexture.uOffset = value[0];
                clearcoatRoughnessTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_clearcoat/clearcoatRoughnessTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const clearcoatRoughnessTexture = this.world.materials[Number(parts[2])].clearCoat.textureRoughness;
            if (clearcoatRoughnessTexture == null) {
                return [NaN, NaN];
            }
            return [clearcoatRoughnessTexture.uScale, clearcoatRoughnessTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const clearcoatRoughnessTexture = this.world.materials[Number(parts[2])].clearCoat.textureRoughness;
            if (clearcoatRoughnessTexture != null) {
                clearcoatRoughnessTexture.uScale = value[0];
                clearcoatRoughnessTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_clearcoat/clearcoatRoughnessTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const clearcoatRoughnessTexture = this.world.materials[Number(parts[2])].clearCoat.textureRoughness;
            return BabylonDecorator.getTextureRotation(clearcoatRoughnessTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const clearcoatRoughnessTexture = this.world.materials[Number(parts[2])].clearCoat.textureRoughness;
            BabylonDecorator.setTextureRotation(clearcoatRoughnessTexture, value);
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_iridescence/iridescenceFactor`, (path) => {
            const parts: string[] = path.split("/");
            const iridescence = (this.world.materials[Number(parts[2])] as PBRMaterial).iridescence.intensity;
            return iridescence === undefined ? [NaN] : [iridescence];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const iridescence = (this.world.materials[Number(parts[2])] as PBRMaterial).iridescence;
            iridescence.isEnabled = true;
            iridescence.intensity = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_iridescence/iridescenceIor`, (path) => {
            const parts: string[] = path.split("/");
            const ior = this.world.materials[Number(parts[2])].iridescence.indexOfRefraction;
            return ior === undefined ? [NaN] : [ior];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            this.world.materials[Number(parts[2])].iridescence.indexOfRefraction = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_iridescence/iridescenceThicknessMinimum`, (path) => {
            const parts: string[] = path.split("/");
            const min = this.world.materials[Number(parts[2])].iridescence.minimumThickness;
            return min === undefined ? [NaN] : [min];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            this.world.materials[Number(parts[2])].iridescence.minimumThickness = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_iridescence/iridescenceThicknessMaximum`, (path) => {
            const parts: string[] = path.split("/");
            const max = this.world.materials[Number(parts[2])].iridescence.maximumThickness;
            return max === undefined ? [NaN] : [max];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            this.world.materials[Number(parts[2])].iridescence.maximumThickness = value;
        }, "float", false);

        // IRIDESCENCE TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_iridescence/iridescenceTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const iridescenceTexture = this.world.materials[Number(parts[2])].iridescence.texture;
            if (iridescenceTexture == null) {
                return [NaN, NaN];
            }
            return [iridescenceTexture.uOffset, iridescenceTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const iridescenceTexture = this.world.materials[Number(parts[2])].iridescence.texture;
            if (iridescenceTexture != null) {
                iridescenceTexture.uOffset = value[0];
                iridescenceTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_iridescence/iridescenceTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const iridescenceTexture = this.world.materials[Number(parts[2])].iridescence.texture;
            if (iridescenceTexture == null) {
                return [NaN, NaN];
            }
            return [iridescenceTexture.uScale, iridescenceTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const iridescenceTexture = this.world.materials[Number(parts[2])].iridescence.texture;
            if (iridescenceTexture != null) {
                iridescenceTexture.uScale = value[0];
                iridescenceTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_iridescence/iridescenceTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const iridescenceTexture = this.world.materials[Number(parts[2])].iridescence.texture;
            return BabylonDecorator.getTextureRotation(iridescenceTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const iridescenceTexture = this.world.materials[Number(parts[2])].iridescence.texture;
            BabylonDecorator.setTextureRotation(iridescenceTexture, value);
        }, "float", false);

        // IRIDESCENCE THICKNESS TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_iridescence/iridescenceThicknessTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const iridescenceThicknessTexture = this.world.materials[Number(parts[2])].iridescence.thicknessTexture;
            if (iridescenceThicknessTexture == null) {
                return [NaN, NaN];
            }
            return [iridescenceThicknessTexture.uOffset, iridescenceThicknessTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const iridescenceThicknessTexture = this.world.materials[Number(parts[2])].iridescence.thicknessTexture;
            if (iridescenceThicknessTexture != null) {
                iridescenceThicknessTexture.uOffset = value[0];
                iridescenceThicknessTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_iridescence/iridescenceThicknessTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const iridescenceThicknessTexture = this.world.materials[Number(parts[2])].iridescence.thicknessTexture;
            if (iridescenceThicknessTexture == null) {
                return [NaN, NaN];
            }
            return [iridescenceThicknessTexture.uScale, iridescenceThicknessTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const iridescenceThicknessTexture = this.world.materials[Number(parts[2])].iridescence.thicknessTexture;
            if (iridescenceThicknessTexture != null) {
                iridescenceThicknessTexture.uScale = value[0];
                iridescenceThicknessTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_iridescence/iridescenceThicknessTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const iridescenceThicknessTexture = this.world.materials[Number(parts[2])].iridescence.thicknessTexture;
            return BabylonDecorator.getTextureRotation(iridescenceThicknessTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const iridescenceThicknessTexture = this.world.materials[Number(parts[2])].iridescence.thicknessTexture;
            BabylonDecorator.setTextureRotation(iridescenceThicknessTexture, value);
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_anisotropy/anisotropyStrength`, (path) => {
            const parts: string[] = path.split("/");
            const anisotropy = (this.world.materials[Number(parts[2])] as PBRMaterial).anisotropy.intensity;
            return anisotropy === undefined ? [NaN] : [anisotropy];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const anisotropy = (this.world.materials[Number(parts[2])] as PBRMaterial).anisotropy;
            anisotropy.isEnabled = true;
            anisotropy.intensity = value;
        }, "float", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_anisotropy/anisotropyRotation`, (path) => {
            const parts: string[] = path.split("/");
            const anisotropyAngle = (this.world.materials[Number(parts[2])] as PBRMaterial).anisotropy.angle;
            return anisotropyAngle === undefined ? [NaN] : [anisotropyAngle];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const anisotropy = (this.world.materials[Number(parts[2])] as PBRMaterial).anisotropy;
            anisotropy.isEnabled = true;
            anisotropy.angle = value;
        }, "float", false);

        // ANISOTROPY TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_anisotropy/anisotropyTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const anisotropyTexture = this.world.materials[Number(parts[2])].anisotropy.texture;
            if (anisotropyTexture == null) {
                return [NaN, NaN];
            }
            return [anisotropyTexture.uOffset, anisotropyTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const anisotropyTexture = this.world.materials[Number(parts[2])].anisotropy.texture;
            if (anisotropyTexture != null) {
                anisotropyTexture.uOffset = value[0];
                anisotropyTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_anisotropy/anisotropyTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const anisotropyTexture = this.world.materials[Number(parts[2])].anisotropy.texture;
            if (anisotropyTexture == null) {
                return [NaN, NaN];
            }
            return [anisotropyTexture.uScale, anisotropyTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const anisotropyTexture = this.world.materials[Number(parts[2])].anisotropy.texture;
            if (anisotropyTexture != null) {
                anisotropyTexture.uScale = value[0];
                anisotropyTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/extensions/KHR_materials_anisotropy/anisotropyTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const anisotropyTexture = this.world.materials[Number(parts[2])].anisotropy.texture;
            return BabylonDecorator.getTextureRotation(anisotropyTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const anisotropyTexture = this.world.materials[Number(parts[2])].anisotropy.texture;
            BabylonDecorator.setTextureRotation(anisotropyTexture, value);
        }, "float", false);

        // BASE COLOR TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const baseColorTexture = this.world.materials[Number(parts[2])].albedoTexture;
            if (baseColorTexture == null) {
                return [NaN, NaN];
            }

            return [baseColorTexture.uOffset, baseColorTexture.vOffset]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const baseColorTexture = this.world.materials[Number(parts[2])].albedoTexture;
            if (baseColorTexture != null) {
                baseColorTexture.uOffset = value[0];
                baseColorTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const baseColorTexture = this.world.materials[Number(parts[2])].albedoTexture;
            if (baseColorTexture == null) {
                return [NaN, NaN];
            }

            return [baseColorTexture.uScale, baseColorTexture.vScale]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const baseColorTexture = this.world.materials[Number(parts[2])].albedoTexture;
            if (baseColorTexture != null) {
                baseColorTexture.uScale = value[0];
                baseColorTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const baseColorTexture = this.world.materials[Number(parts[2])].albedoTexture;
            return BabylonDecorator.getTextureRotation(baseColorTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const baseColorTexture = this.world.materials[Number(parts[2])].albedoTexture;
            BabylonDecorator.setTextureRotation(baseColorTexture, value);
        }, "float", false);

        // METALLIC ROUGHNESS TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/metallicRoughnessTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const metallicTexture = this.world.materials[Number(parts[2])].metallicTexture;
            if (metallicTexture == null) {
                return [NaN, NaN];
            }

            return [metallicTexture.uOffset, metallicTexture.vOffset]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const metallicTexture = this.world.materials[Number(parts[2])].metallicTexture;
            if (metallicTexture != null) {
                metallicTexture.uOffset = value[0];
                metallicTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/metallicRoughnessTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const metallicTexture = this.world.materials[Number(parts[2])].metallicTexture;
            if (metallicTexture == null) {
                return [NaN, NaN];
            }

            return [metallicTexture.uScale, metallicTexture.vScale]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const metallicTexture = this.world.materials[Number(parts[2])].metallicTexture;
            if (metallicTexture != null) {
                metallicTexture.uScale = value[0];
                metallicTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/metallicRoughnessTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const metallicTexture = this.world.materials[Number(parts[2])].metallicTexture;
            return BabylonDecorator.getTextureRotation(metallicTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const metallicTexture = this.world.materials[Number(parts[2])].metallicTexture;
            BabylonDecorator.setTextureRotation(metallicTexture, value);
        }, "float", false);

        // NORMAL TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/normalTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].bumpTexture;
            if (normalTexture == null) {
                return [NaN, NaN];
            }

            return [normalTexture.uOffset, normalTexture.vOffset]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].bumpTexture;
            if (normalTexture != null) {
                normalTexture.uOffset = value[0];
                normalTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/normalTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].bumpTexture;
            if (normalTexture == null) {
                return [NaN, NaN];
            }

            return [normalTexture.uScale, normalTexture.vScale]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].bumpTexture;
            if (normalTexture != null) {
                normalTexture.uScale = value[0];
                normalTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/normalTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].bumpTexture;
            return BabylonDecorator.getTextureRotation(normalTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].bumpTexture;
            BabylonDecorator.setTextureRotation(normalTexture, value);
        }, "float", false);

        // OCCLUSION TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/occlusionTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].ambientTexture;
            if (occlusionTexture == null) {
                return [NaN, NaN];
            }

            return [occlusionTexture.uOffset, occlusionTexture.vOffset]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].ambientTexture;
            if (occlusionTexture != null) {
                occlusionTexture.uOffset = value[0];
                occlusionTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/occlusionTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].ambientTexture;
            if (occlusionTexture == null) {
                return [NaN, NaN];
            }

            return [occlusionTexture.uScale, occlusionTexture.vScale]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].ambientTexture;
            if (occlusionTexture != null) {
                occlusionTexture.uScale = value[0];
                occlusionTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/occlusionTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].ambientTexture;
            return BabylonDecorator.getTextureRotation(occlusionTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].ambientTexture;
            BabylonDecorator.setTextureRotation(occlusionTexture, value);
        }, "float", false);

        // EMISSIVE TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/emissiveTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const emissiveTexture = this.world.materials[Number(parts[2])].emissiveTexture;
            if (emissiveTexture == null) {
                return [NaN, NaN];
            }

            return [emissiveTexture.uOffset, emissiveTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const emissiveTexture = this.world.materials[Number(parts[2])].emissiveTexture;
            if (emissiveTexture != null) {
                emissiveTexture.uOffset = value[0];
                emissiveTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/emissiveTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const emissiveTexture = this.world.materials[Number(parts[2])].emissiveTexture;
            if (emissiveTexture == null) {
                return [NaN, NaN];
            }

            return [emissiveTexture.uScale, emissiveTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const emissiveTexture = this.world.materials[Number(parts[2])].emissiveTexture;
            if (emissiveTexture != null) {
                emissiveTexture.uScale = value[0];
                emissiveTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/emissiveTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const emissiveTexture = this.world.materials[Number(parts[2])].emissiveTexture;
            return BabylonDecorator.getTextureRotation(emissiveTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const emissiveTexture = this.world.materials[Number(parts[2])].emissiveTexture;
            BabylonDecorator.setTextureRotation(emissiveTexture, value);
        }, "float", false);

        this.registerMaterialTextureCoordinatePointers(maxGlTFMaterials);
        this.registerClearcoatNormalTexturePointers(maxGlTFMaterials);

        this.registerJsonPointer('/meshes.length', (path) => {
            return [gltf !== undefined ? gltf.meshes?.length ?? 0 : glTFMeshPrimitives.length === 0 ? 0 : maxGlTFMeshIndex + 1];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer(`/meshes/${maxGlTFMeshIndex}/primitives.length`, (path) => {
            const parts: string[] = path.split("/");
            return [gltf !== undefined ? gltf.meshes?.[Number(parts[2])]?.primitives?.length ?? 0 : getMeshPrimitives(Number(parts[2])).length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer('/cameras.length', (path) => {
            return [this.world.assetModel?.cameras.length ?? this.scene.metadata?.gltfCameraDefinitions?.length ?? glTFCameras.length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer('/scene', (path) => {
            return [gltf?.scene ?? 0];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer('/scenes.length', (path) => {
            return [gltf !== undefined ? gltf.scenes?.length ?? 0 : 1];
        }, (path, value) => {
            //no-op
        }, "int", true);

        const maxScene: number = Math.max(0, (gltf?.scenes?.length ?? 1) - 1);
        const getSceneNodeIndices = (sceneIndex: number): number[] => gltf !== undefined
            ? gltf.scenes?.[sceneIndex]?.nodes ?? []
            : sceneIndex === 0 ? rootLevelNodeIndices : [];
        this.registerJsonPointer(`/scenes/${maxScene}/nodes.length`, (path) => {
            return [getSceneNodeIndices(Number(path.split("/")[2])).length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        const maxSceneNode: number = Math.max(0,
            ...(gltf?.scenes ?? []).map((scene: { nodes?: number[] }) => (scene.nodes?.length ?? 0) - 1),
            rootLevelNodeIndices.length - 1);
        this.registerJsonPointer(`/scenes/${maxScene}/nodes/${maxSceneNode}`, (path) => {
            const parts: string[] = path.split("/");
            const nodeIndex = getSceneNodeIndices(Number(parts[2]))[Number(parts[4])];
            return reference("nodes", nodeIndex);
        }, (path, value) => {
            //no-op
        }, "ref", true);

        this.registerJsonPointer('/skins.length', (path) => {
            return [gltf !== undefined ? gltf.skins?.length ?? 0 : glTFSkeletons.length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        const maxSkin: number = Math.max(0, (gltf?.skins?.length ?? 0) - 1, ...glTFSkeletons.map(skeleton => getSkinIndexForSkeleton(skeleton)!));
        this.registerJsonPointer(`/skins/${maxSkin}/joints.length`, (path) => {
            const parts: string[] = path.split("/");
            const skeleton = getSkeleton(Number(parts[2]));
            return [gltf !== undefined ? gltf.skins?.[Number(parts[2])]?.joints?.length ?? 0 : skeleton === undefined ? 0 : getSkeletonJointNodeIndices(skeleton).length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        const maxSkinJoint: number = Math.max(0,
            ...(gltf?.skins ?? []).map((skin: { joints: number[] }) => skin.joints.length - 1),
            ...glTFSkeletons.map((s: any) => getSkeletonJointNodeIndices(s).length - 1));
        this.registerJsonPointer(`/skins/${maxSkin}/joints/${maxSkinJoint}`, (path) => {
            const parts: string[] = path.split("/");
            if (gltf !== undefined) return reference("nodes", gltf.skins?.[Number(parts[2])]?.joints?.[Number(parts[4])]);
            const skeleton = getSkeleton(Number(parts[2]));
            const jointNodeIndex = skeleton === undefined ? undefined : getSkeletonJointNodeIndices(skeleton)[Number(parts[4])];
            return reference("nodes", jointNodeIndex);
        }, (path, value) => {
            //no-op
        }, "ref", true);

        this.registerJsonPointer(`/skins/${maxSkin}/skeleton`, (path) => {
            const parts: string[] = path.split("/");
            return reference("nodes", gltf?.skins?.[Number(parts[2])]?.skeleton);
        }, (path, value) => {
            //no-op
        }, "ref", true);

        this.registerJsonPointer('/materials.length', (path) => {
            return [this.world.materials.length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer('/animations.length', (path) => {
            return [this.world.animations.length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer(`/animations/${maxAnimations}`, (path) => {
            const parts: string[] = path.split("/");
            const animationIndex = Number(parts[2]);
            return this.world.animations[animationIndex] === undefined ? undefined : reference("animations", animationIndex);
        }, (path, value) => {
            //no-op
        }, "ref", true);

        this.registerJsonPointer(`/meshes/${maxGlTFMeshIndex}/primitives/${maxMeshPrimitiveIndex}/material`, (path) => {
            const parts: string[] = path.split("/");
            if (gltf !== undefined) return reference("materials", gltf.meshes?.[Number(parts[2])]?.primitives?.[Number(parts[4])]?.material);
            const primitive = glTFMeshPrimitives.find(primitive =>
                primitive.meshIndex === Number(parts[2]) && primitive.primitiveIndex === Number(parts[4]));
            if (primitive === undefined || primitive.babylonMesh.material == null) {
                return undefined;
            }
            const materialIndex = this.world.materials.indexOf(primitive.babylonMesh.material);
            return reference("materials", materialIndex);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const primitive = glTFMeshPrimitives.find(primitive =>
                primitive.meshIndex === Number(parts[2]) && primitive.primitiveIndex === Number(parts[4]));
            if (primitive === undefined) return;
            const materialIndex = typeof value === "string"
                ? Number(value.split("/").filter((p: string) => p !== "").pop())
                : Number(value);
            primitive.babylonMesh.material = this.world.materials[materialIndex];
        }, "ref", true);

        this.registerJsonPointer(`/animations/${maxAnimations}/extensions/KHR_interactivity/isPlaying`, (path) => {
            const parts: string[] = path.split("/");
            const animation: AnimationGroup = this.world.animations[Number(parts[2])];
            return [animation.metadata?.instance?.isPlaying ?? false];
        }, (path, value) => {
            //no-op
        }, "bool", true);

        this.registerJsonPointer(`/animations/${maxAnimations}/extensions/KHR_interactivity/minTime`, (path) => {
            const parts: string[] = path.split("/");
            const animation: AnimationGroup = this.world.animations[Number(parts[2])];
            const fps = 60;
            return [animation === undefined ? NaN : animation.from / fps];
        }, (path, value) => {
            //no-op
        }, "float", true);

        this.registerJsonPointer(`/animations/${maxAnimations}/extensions/KHR_interactivity/maxTime`, (path) => {
            const parts: string[] = path.split("/");
            const animation: AnimationGroup = this.world.animations[Number(parts[2])];
            const fps = 60;
            return [animation === undefined ? NaN : animation.to / fps];
        }, (path, value) => {
            //no-op
        }, "float", true);

        // spec: both playheads are 0 before the first start and keep their last value once the animation stops
        this.registerJsonPointer(`/animations/${maxAnimations}/extensions/KHR_interactivity/playhead`, (path) => {
            const parts: string[] = path.split("/");
            const animation: AnimationGroup = this.world.animations[Number(parts[2])];
            if (animation === undefined) {return [NaN]}
            // while playing, Babylon's own frame is the playhead
            const animatable = animation.metadata?.instance?.isPlaying ? animation.metadata.instance.animatables[0] : undefined;
            if (animatable !== undefined) {
                return [animatable.masterFrame / 60];
            }
            return [effectiveAnimationTime({maxTime: animation.to / 60}, this.virtualPlayhead(animation))];
        }, (path, value) => {
            //no-op
        }, "float", true);

        this.registerJsonPointer(`/animations/${maxAnimations}/extensions/KHR_interactivity/virtualPlayhead`, (path) => {
            const parts: string[] = path.split("/");
            const animation: AnimationGroup = this.world.animations[Number(parts[2])];
            if (animation === undefined) {return [NaN]}
            return [this.virtualPlayhead(animation)];
        }, (path, value) => {
            //no-op
        }, "float", true);

        this.bridgeLightPointers();
    }

    // Concrete per-light bindings: the JsonPtrTrie wildcards indices, which would expose the
    // spot/* pointers on point and directional lights (they must be invalid, set -> [err]).
    private bridgeLightPointers(): void {
        // Babylon stores the light pointer as /nodes/{nodeIndex}/extensions/KHR_lights_punctual;
        // the node -> light index map was snapshotted from the raw glTF JSON during loading.
        const lightPointerRegex = /^\/nodes\/(\d+)\/extensions\/KHR_lights_punctual$/;
        const nodeToLightIndex: {[nodeIndex: number]: number} = this.scene.metadata?.khrLightsNodeToLightIndex ?? {};
        const lightsByIndex = new Map<number, Light[]>();
        for (const light of this.scene.lights as any[]) {
            const match = light._internalMetadata?.gltf?.pointers?.map((p: string) => lightPointerRegex.exec(p)).find(Boolean);
            if (!match) continue;
            const lightIndex = nodeToLightIndex[Number(match[1])] ?? Number(match[1]);
            lightsByIndex.set(lightIndex, [...(lightsByIndex.get(lightIndex) ?? []), light]);
        }

        const bindings = new Map<string, IJsonPtrEntry>();
        const bind = (path: string, typeName: string, get: () => number[], set: (value: any) => void): void => {
            bindings.set(path, {typeName, readOnly: false, getValue: get, setValue: (_path, value) => set(value)});
        };
        lightsByIndex.forEach((lights, lightIndex) => {
            const prefix = `/extensions/KHR_lights_punctual/lights/${lightIndex}`;
            const light = lights[0];
            bind(`${prefix}/color`, "float3", () => [light.diffuse.r, light.diffuse.g, light.diffuse.b],
                value => lights.forEach(l => l.diffuse = new Color3(value[0], value[1], value[2])));
            bind(`${prefix}/intensity`, "float", () => [light.intensity], value => lights.forEach(l => l.intensity = value));
            bind(`${prefix}/range`, "float", () => [light.range], value => lights.forEach(l => l.range = value));
            if (!(light instanceof SpotLight)) return;
            const spots = lights as SpotLight[];
            bind(`${prefix}/spot/innerConeAngle`, "float", () => [light.innerAngle / 2], value => spots.forEach(l => l.innerAngle = value * 2));
            bind(`${prefix}/spot/outerConeAngle`, "float", () => [light.angle / 2], value => spots.forEach(l => l.angle = value * 2));
        });

        const engine = this.behaveEngine;
        const resolve = engine.resolveJsonPtr;
        const registered = engine.getRegisteredJsonPointers;
        engine.resolveJsonPtr = path => path.startsWith("/extensions/KHR_lights_punctual/lights/") ? bindings.get(path) : resolve(path);
        engine.getRegisteredJsonPointers = () => [...registered(), ...bindings.keys()].sort();
    }

    public extractBehaveGraphFromScene = (): any => {
        if (this.scene.metadata?.behaveGraph === undefined) {
            console.info('No behavior found in scene');
            return;
        }

        return this.scene.metadata.behaveGraph;
    };

    public startAnimation = (animation: number, startTime: number, endTime: number, speed: number,  callback: () => void): void => {
        // const fps = this.behaveEngine.fps;
        //TODO: how should animation fps be determined?
        const fps = 60;
        const startFrame: number = startTime * fps;
        const endFrame: number = endTime * fps;

        const anim: AnimationGroup = this.world.animations[animation]
        anim.metadata = anim.metadata || {};
        const timeline = { startTime, endTime, speed, startedAt: performance.now(), finishedAt: undefined as number | undefined };
        anim.metadata.timeline = timeline;
        const endCallback = callback;
        callback = () => {
            timeline.finishedAt = endTime;
            endCallback();
        };

        const loopingForever = !isFinite(endFrame);
        const forward = startFrame < endFrame;

        if (!loopingForever) {
            const loops = Math.abs(endFrame - startFrame)/(anim.to - anim.from);
            if (forward) {
                if (loops > 1) {
                    let count = 0;
                    this._animateRange(speed, true, true, anim.from, anim.to, startFrame, anim, undefined, () => {
                        count++;
                        if (count > loops) {
                            this._animateRange(speed, true, false, anim.from, endFrame % anim.to, anim.from, anim, callback, undefined);
                        }
                    })
                } else if (endFrame <= anim.to) {
                    this._animateRange(speed, true, false, startFrame, endFrame, startFrame, anim, callback, undefined);
                } else {
                    this._animateRange(speed, true, false, startFrame, anim.to, startFrame, anim, () => {
                        this._animateRange(speed, true, false, anim.from, endFrame - anim.to, anim.to, anim, callback, undefined);
                    }, undefined)
                }
            } else {
                if (loops > 1) {
                    let count = 0;
                    this._animateRange(speed, false, true, anim.to, anim.from, startFrame, anim, undefined, () => {
                        count++;
                        if (count > loops) {
                            this._animateRange(speed, false, false, anim.to, anim.from  - ((endFrame - startFrame) % (anim.to - anim.from)), anim.to, anim,
                                callback, undefined);
                        }
                    })
                } else if (endFrame >= 0) {
                    this._animateRange(speed, false, false, startFrame, endFrame, startFrame, anim, callback, undefined);
                } else {
                    this._animateRange(speed, false, false, startFrame, anim.from, startFrame, anim, () => {
                        this._animateRange(speed, false, false, anim.to, endFrame + anim.to, anim.to, anim, callback, undefined);
                    }, undefined)
                }
            }
        } else {
            if (forward) {
                //forward
                this._animateRange(speed, true, true, anim.from, anim.to, startFrame, anim, undefined,undefined);
            } else {
                //backwards
                this._animateRange(speed, false, true, anim.to, anim.from, startFrame, anim, undefined, undefined);
            }
        }
    }

    public stopAnimation = (animationIndex: number): void => {
        const animation: AnimationGroup = this.world.animations[animationIndex]
        const animationInstance: AnimationGroup = animation?.metadata?.instance;
        if (animationInstance === undefined) return;

        if (animation.metadata.timeline !== undefined) {
            animation.metadata.timeline.finishedAt = this.virtualPlayhead(animation);
        }
        // Babylon's stop() fires the end observable; animation/stop must not activate any done flow
        animationInstance.onAnimationGroupEndObservable.clear();
        animationInstance.stop();
        animationInstance.dispose();
        animation.metadata.instance = undefined;
    }

    public stopAnimationAt = (animationIndex: number, stopTime: number , callback: () => void): void => {
        const animation: AnimationGroup = this.world.animations[animationIndex]
        const animationInstance: AnimationGroup = animation?.metadata?.instance;
        if (animationInstance === undefined) return;

        const forward = animationInstance.metadata.isForward;
        if (animationInstance.animatables[0] === undefined) {return}
        const stopCallback = callback;
        callback = () => {
            if (animation.metadata.timeline !== undefined) {
                animation.metadata.timeline.finishedAt = stopTime;
            }
            stopCallback();
        };
        const frame = animationInstance.animatables[0].animationStarted ? animationInstance.animatables[0].masterFrame : animationInstance.animatables[0].fromFrame;
        const fps = 60;
        const stopFrame = stopTime * fps;
        // spec: stop only applies within [start, end); at or past the end time the animation completes normally
        if ((forward && (stopFrame < animationInstance.animatables[0].fromFrame || stopFrame >= animationInstance.animatables[0].toFrame) ||
            (!forward && (stopFrame > animationInstance.animatables[0].fromFrame || stopFrame <= animationInstance.animatables[0].toFrame)))) {
            //no-op since we are outside the animation range
            return;
        }
        if ((forward && stopFrame <= frame) || (!forward && stopFrame >= frame)) {
            //snap to stop frame if we have passed it
            animationInstance.goToFrame(stopFrame);
            animationInstance.onAnimationGroupEndObservable.clear();
            animationInstance.stop();
            animationInstance.dispose();
            callback();
            return;
        }
        this._animateRange(animationInstance.speedRatio, forward, false, frame, stopFrame, frame, animation, () => callback(), undefined);
    }

    // requested timestamp on the infinite timeline (spec virtualPlayhead), derived from the last animation/start
    private virtualPlayhead(animation: AnimationGroup): number {
        const timeline = animation.metadata?.timeline;
        if (timeline === undefined) {
            return 0;
        }
        if (timeline.finishedAt !== undefined) {
            return timeline.finishedAt;
        }
        const elapsed = Math.max(0, (performance.now() - timeline.startedAt) / 1000) * timeline.speed;
        return timeline.startTime <= timeline.endTime
            ? Math.min(timeline.startTime + elapsed, timeline.endTime)
            : Math.max(timeline.startTime - elapsed, timeline.endTime);
    }

    private _animateRange = (speed: float, isForward: boolean, isLoop: boolean, startFrame: float, endFrame: float, currentFrame: float,
                             animation: AnimationGroup, endCallback: (() => void) | undefined, loopCallback: (() => void )| undefined) => {
        if (animation.metadata.instance !== undefined) {
            //clear any previous animation
            if (animation.metadata.instance.isPlaying) {
                // the replaced instance's done flow must not fire (spec: superseded done flows are not activated)
                animation.metadata.instance.onAnimationGroupEndObservable.clear();
                animation.metadata.instance.stop();
                animation.metadata.instance.dispose();
            }
            animation.metadata.instance = undefined;
        }

        const animationInstance: AnimationGroup = animation.clone(`${animation.name}-instance`);
        animation.metadata.instance = animationInstance;
        animation.metadata.instance.metadata = animation.metadata.instance.metadata || {};
        animation.metadata.instance.metadata.isForward = isForward;

        animationInstance.start(isLoop, speed, startFrame, endFrame, false);

        if (isLoop) {
            animationInstance.goToFrame(currentFrame);
        }


        if (endCallback !== undefined) {
            animationInstance.onAnimationGroupEndObservable.add(endCallback);
        }
        if (loopCallback !== undefined) {
            animationInstance.onAnimationGroupLoopObservable.add(loopCallback);
        }
    }
}
