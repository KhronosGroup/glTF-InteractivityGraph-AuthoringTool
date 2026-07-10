import {ADecorator} from "../BasicBehaveEngine/ADecorator";
import {BehaveEngineNode} from "../BasicBehaveEngine/BehaveEngineNode";
import {IBehaveEngine} from "../BasicBehaveEngine/IBehaveEngine";
import {
    AbstractMesh,
    AnimationGroup, Camera, Color3,
    float,
    Matrix, PBRMaterial,
    PointerEventTypes,
    Quaternion,
    TargetCamera, Node,
    PickingInfo,
    IPointerEvent,
    TransformNode,
    Material,
    Observer,
    PointerInfo,
    SpotLight
} from "@babylonjs/core";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {cubicBezier, easeFloat, easeFloat3, easeFloat4, linearFloat, slerpFloat4} from "../BasicBehaveEngine/easingUtils";
import {Scene} from "@babylonjs/core/scene";
import {OnSelect} from "../BasicBehaveEngine/nodes/experimental/OnSelect";
import {KHR_materials_variants} from "@babylonjs/loaders/glTF/2.0";
import {AnimationStart} from "../BasicBehaveEngine/nodes/animation/AnimationStart";
import {AnimationStop} from "../BasicBehaveEngine/nodes/animation/AnimationStop";
import {AnimationStopAt} from "../BasicBehaveEngine/nodes/animation/AnimationStopAt";
import {Nullable} from "@babylonjs/core/types.js";
import { OnHoverIn } from "../BasicBehaveEngine/nodes/experimental/OnHoverIn";
import { OnHoverOut } from "../BasicBehaveEngine/nodes/experimental/OnHoverOut";
import { IInteractivityFlow } from "../BasicBehaveEngine/types/InteractivityGraph";
import * as glMatrix from "gl-matrix";

export class BabylonDecorator extends ADecorator {
    scene: Scene;
    world: any;
    hoveredNode: any;
    hoveredNodeIndex: number;
    private beforeRenderObserver: Observer<Scene> | null = null;
    private pointerObserver: Observer<PointerInfo> | null = null;

    constructor(behaveEngine: IBehaveEngine, world: any, scene: Scene) {
        super(behaveEngine);
        this.world = world;
        this.scene = scene;
        this.bridgeEngineHooks();
        this.registerKnownPointers();
        this.registerBehaveEngineNode("event/onSelect", OnSelect);
        this.registerBehaveEngineNode("event/onHoverIn", OnHoverIn);
        this.registerBehaveEngineNode("event/onHoverOut", OnHoverOut);
        this.registerBehaveEngineNode("animation/stop", AnimationStop);
        this.registerBehaveEngineNode("animation/start", AnimationStart);
        this.registerBehaveEngineNode("animation/stopAt", AnimationStopAt);

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
            node.inheritVisibility = true;
        }
    }

    /** Babylon.js is left-handed; glTF/KHR_interactivity is right-handed, so X is negated. */
    private static toRightHandedXYZ(x: number, y: number, z: number): [number, number, number] {
        return [-x, y, z];
    }

    // Undoes the left-handed conversion Babylon's glTF loader bakes into its __root__ node
    // (Y-180° + scale(1,1,-1) == net negate-X). Left-multiplying the world matrix by diag(-1,1,1)
    // inverts it; in Babylon's column-major array that negates the X-output row (indices 0,4,8,12).
    // Assumes a left-handed scene (scene.useRightHandedSystem === false), which is how it's created here.
    private static toRightHandedMatrixArray(m: ArrayLike<number>): number[] {
        return [
            -m[0], m[1], m[2], m[3],
            -m[4], m[5], m[6], m[7],
            -m[8], m[9], m[10], m[11],
            -m[12], m[13], m[14], m[15]
        ];
    }

    // KHR_texture_transform rotation is negated by Babylon's glTF loader/exporter convention, see
    // https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/loaders/src/glTF/2.0/Extensions/KHR_texture_transform.ts#L73
    private static getTextureRotation(texture: {wAng: number} | null | undefined): [number] {
        return texture == null ? [NaN] : [-1 * texture.wAng];
    }

    private static setTextureRotation(texture: {wAng: number} | null | undefined, value: number[]): void {
        if (texture != null) {
            texture.wAng = -1 * value[0];
        }
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
        const node = this.world.glTFNodes[nodeIndex];
        if (!node || !node.parent) {
            return undefined;
        }
        const parentNodeIndex = this.world.glTFNodes.findIndex((value: { uniqueId: number; }) => value.uniqueId === node.parent.uniqueId);
        return parentNodeIndex !== -1 ? parentNodeIndex : undefined;
    }

    private getGlTFNodeIndexForBabylonNode(node: Node | null | undefined): number | undefined {
        let currentNode: Node | null | undefined = node;
        while (currentNode != null) {
            const metadataNodeIndex = currentNode.metadata?.nodeIndex;
            if (Number.isInteger(metadataNodeIndex)) {
                return metadataNodeIndex;
            }

            const nodeIndex = this.world.glTFNodes.findIndex((value: { uniqueId: number; }) => value.uniqueId === currentNode!.uniqueId);
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
        const maxGltfNode:number = this.world.glTFNodes.length-1;
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
        const maxGlTFMeshIndex: number = Math.max(0, ...glTFMeshPrimitives.map(p => p.meshIndex));
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

        const skinPointerRegex = /^\/skins\/\d+$/;
        const glTFSkeletons = this.scene.skeletons
            .filter((s: any) => s._internalMetadata?.gltf?.pointers?.some((p: string) => skinPointerRegex.test(p)))
            .sort((a: any, b: any) => {
                const aIndex = Number(a._internalMetadata.gltf.pointers.find((p: string) => skinPointerRegex.test(p)).split("/").pop());
                const bIndex = Number(b._internalMetadata.gltf.pointers.find((p: string) => skinPointerRegex.test(p)).split("/").pop());
                return aIndex - bIndex;
            });
        const getSkeletonJointNodeIndices = (skeleton: any): number[] => skeleton.bones
            .map((bone: any) => bone.getTransformNode()?.metadata?.nodeIndex)
            .filter((idx: number | undefined) => idx !== undefined);
        const getSkeletonRootNodeIndex = (skeleton: any): number | undefined => {
            const rootBone = skeleton.bones.find((bone: any) => bone.getParent() == null);
            return rootBone?.getTransformNode()?.metadata?.nodeIndex;
        };

        const rootLevelNodeIndices = this.world.glTFNodes
            .map((_: any, idx: number) => idx)
            .filter((idx: number) => this.getParentNodeIndex(idx) === undefined);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/scale`, (path) => {
            const parts: string[] = path.split("/");
            return [(this.world.glTFNodes[Number(parts[2])] as AbstractMesh).scaling.x,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).scaling.y,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).scaling.z];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).scaling = new Vector3(value[0], value[1], value[2]);
        }, "float3", false);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/translation`, (path) => {
            const parts: string[] = path.split("/");
            return [(this.world.glTFNodes[Number(parts[2])] as AbstractMesh).position.x,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).position.y,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).position.z];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).position= new Vector3(value[0], value[1], value[2]);
        }, "float3", false);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/rotation`, (path) => {
            const parts: string[] = path.split("/");
            return [
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).rotationQuaternion?.x,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).rotationQuaternion?.y,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).rotationQuaternion?.z,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).rotationQuaternion?.w];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).rotationQuaternion = new Quaternion(value[0], value[1], value[2], value[3]);
        }, "float4", false);

        this.registerJsonPointer(`/extensions/KHR_interactivity/activeCamera/rotation`, (path) => {
            const activeCamera: Nullable<Camera> = this.scene.activeCamera;
            if (activeCamera === null || !(activeCamera instanceof TargetCamera)) {
                return [NaN, NaN, NaN, NaN]
            }

            let rotation = new Quaternion(activeCamera.absoluteRotation.x, activeCamera.absoluteRotation.y, activeCamera.absoluteRotation.z, activeCamera.absoluteRotation.w);
            // Quaternion representing a 180-degree rotation around Y: (x=0, y=1, z=0, w=0)
            const rot180Y = new Quaternion(0, 1, 0, 0);
            rotation = rot180Y.multiply(rotation);
            return [rotation.x, -1 * rotation.y, rotation.z, rotation.w]
        }, (path, value) => {
            //no-op
        }, "float4", true)

        this.registerJsonPointer(`/extensions/KHR_interactivity/activeCamera/position`, (path) => {
            const activeCamera: Nullable<Camera> = this.scene.activeCamera;
            if (activeCamera === null) {
                return [NaN, NaN, NaN]
            }

            console.log(`Camera position: ${activeCamera.position.x}, ${activeCamera.position.y}, ${activeCamera.position.z}`)
            return BabylonDecorator.toRightHandedXYZ(activeCamera.position.x, activeCamera.position.y, activeCamera.position.z)
        }, (path, value) => {
            //no-op
        }, "float3", true)

        //TODO: update to match what object model has once that is published
        this.registerJsonPointer(`/KHR_materials_variants/variant`, (path) => {
            let root = this.world.glTFNodes[0];
            while (root.parent) {
                root = root.parent;
            }
            const variants = KHR_materials_variants.GetAvailableVariants(root);
            const selectedVariant = KHR_materials_variants.GetLastSelectedVariant(root);
            return [variants.indexOf(selectedVariant as string)];
        }, (path, value) => {
            let root = this.world.glTFNodes[0];
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
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as Material;
            material.backFaceCulling = !value;
        }, "bool", false);

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
            const normalTexture = this.world.materials[Number(parts[2])].normalTexture;
            if (normalTexture == null) {
                return [NaN, NaN];
            }

            return [normalTexture.uOffset, normalTexture.vOffset]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].normalTexture;
            if (normalTexture != null) {
                normalTexture.uOffset = value[0];
                normalTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/normalTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].normalTexture;
            if (normalTexture == null) {
                return [NaN, NaN];
            }

            return [normalTexture.uScale, normalTexture.vScale]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].normalTexture;
            if (normalTexture != null) {
                normalTexture.uScale = value[0];
                normalTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/normalTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].normalTexture;
            return BabylonDecorator.getTextureRotation(normalTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].normalTexture;
            BabylonDecorator.setTextureRotation(normalTexture, value);
        }, "float", false);

        // OCCLUSION TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/occlusionTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].occlusionTexture;
            if (occlusionTexture == null) {
                return [NaN, NaN];
            }

            return [occlusionTexture.uOffset, occlusionTexture.vOffset]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].occlusionTexture;
            if (occlusionTexture != null) {
                occlusionTexture.uOffset = value[0];
                occlusionTexture.vOffset = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/occlusionTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].occlusionTexture;
            if (occlusionTexture == null) {
                return [NaN, NaN];
            }

            return [occlusionTexture.uScale, occlusionTexture.vScale]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].occlusionTexture;
            if (occlusionTexture != null) {
                occlusionTexture.uScale = value[0];
                occlusionTexture.vScale = value[1];
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/occlusionTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].occlusionTexture;
            return BabylonDecorator.getTextureRotation(occlusionTexture);
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].occlusionTexture;
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

        this.registerJsonPointer(`/nodes/${maxGltfNode}/extensions/KHR_node_selectability/selectable`, (path) => {
            const parts: string[] = path.split("/");
            const metadata = this.world.glTFNodes[Number(parts[2])].metadata;
            if (metadata == undefined) {return true}
            return [metadata.selectable];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            this.world.glTFNodes[Number(parts[2])].metadata = this.world.glTFNodes[Number(parts[2])].metadata || {};
            this.world.glTFNodes[Number(parts[2])].metadata.selectable = value;
            if (this.world.glTFNodes[Number(parts[2])] instanceof AbstractMesh) {
                //swim up
                let curNode = this.world.glTFNodes[Number(parts[2])];
                let pickability: boolean = curNode.metadata.selectable;
                while (curNode.parent != null && pickability) {
                    curNode = curNode.parent;
                    pickability = pickability && (curNode.metadata?.selectable ?? true)
                }
                this.world.glTFNodes[Number(parts[2])].isPickable = pickability;
            }
            for (const child of this.world.glTFNodes[Number(parts[2])].getChildren()) {
                //swim down
                this.swimDownSelectability(child, value)
            }
        }, "bool", false);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/extensions/KHR_node_visibility/visible`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            if (node instanceof AbstractMesh) {
                return [(node as AbstractMesh).isVisible];
            }
            return [true];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];

            node.isVisible = value;
            node.getChildMeshes().forEach((child: AbstractMesh) => {
                if (child.metadata?.pointer === undefined) {
                    // if the child does not have a pointer, that means it is a primitive
                    child.isVisible = value;
                }
            });
        }, "bool", false);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/extensions/KHR_node_hoverability/hoverable`, (path) => {
            const parts: string[] = path.split("/");
            const metadata = this.world.glTFNodes[Number(parts[2])].metadata;
            if (metadata == undefined) {return [true]}
            return [metadata.hoverable];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            this.world.glTFNodes[Number(parts[2])].metadata = this.world.glTFNodes[Number(parts[2])].metadata || {};
            this.world.glTFNodes[Number(parts[2])].metadata.hoverable = value;
            if (this.world.glTFNodes[Number(parts[2])] instanceof AbstractMesh) {
                //swim up
                let curNode = this.world.glTFNodes[Number(parts[2])];
                let hoverability: boolean = curNode.metadata.hoverable;
                while (curNode.parent != null && hoverability) {
                    curNode = curNode.parent;
                    hoverability = hoverability && (curNode.metadata.hoverable ?? true)
                }
                this.world.glTFNodes[Number(parts[2])].metadata.compositeHoverability = hoverability;
            }
            for (const child of this.world.glTFNodes[Number(parts[2])].getChildren()) {
                //swim down
                this.swimDownHoverability(child, value)
            }
        }, "bool", false);

        this.registerJsonPointer('/nodes.length', (path) => {
            return [this.world.glTFNodes.length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer('/meshes.length', (path) => {
            return [glTFMeshPrimitives.length === 0 ? 0 : maxGlTFMeshIndex + 1];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer(`/meshes/${maxGlTFMeshIndex}/primitives.length`, (path) => {
            const parts: string[] = path.split("/");
            return [getMeshPrimitives(Number(parts[2])).length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer('/cameras.length', (path) => {
            return [glTFCameras.length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer('/scene', (path) => {
            return [0];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer('/scenes.length', (path) => {
            return [1];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer('/scenes/0/nodes.length', (path) => {
            return [rootLevelNodeIndices.length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        const maxSceneNode: number = Math.max(0, rootLevelNodeIndices.length - 1);
        this.registerJsonPointer(`/scenes/0/nodes/${maxSceneNode}`, (path) => {
            const parts: string[] = path.split("/");
            const nodeIndex = rootLevelNodeIndices[Number(parts[4])];
            return [nodeIndex === undefined ? null : `/nodes/${nodeIndex}/`];
        }, (path, value) => {
            //no-op
        }, "ref", true);

        this.registerJsonPointer('/skins.length', (path) => {
            return [glTFSkeletons.length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        const maxSkin: number = Math.max(0, glTFSkeletons.length - 1);
        this.registerJsonPointer(`/skins/${maxSkin}/joints.length`, (path) => {
            const parts: string[] = path.split("/");
            const skeleton = glTFSkeletons[Number(parts[2])];
            return [skeleton === undefined ? 0 : getSkeletonJointNodeIndices(skeleton).length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        const maxSkinJoint: number = Math.max(0, ...glTFSkeletons.map((s: any) => getSkeletonJointNodeIndices(s).length - 1));
        this.registerJsonPointer(`/skins/${maxSkin}/joints/${maxSkinJoint}`, (path) => {
            const parts: string[] = path.split("/");
            const skeleton = glTFSkeletons[Number(parts[2])];
            const jointNodeIndex = skeleton === undefined ? undefined : getSkeletonJointNodeIndices(skeleton)[Number(parts[4])];
            return [jointNodeIndex === undefined ? null : `/nodes/${jointNodeIndex}/`];
        }, (path, value) => {
            //no-op
        }, "ref", true);

        this.registerJsonPointer(`/skins/${maxSkin}/skeleton`, (path) => {
            const parts: string[] = path.split("/");
            const skeleton = glTFSkeletons[Number(parts[2])];
            const rootNodeIndex = skeleton === undefined ? undefined : getSkeletonRootNodeIndex(skeleton);
            return [rootNodeIndex === undefined ? null : `/nodes/${rootNodeIndex}/`];
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

        this.registerJsonPointer(`/animations/${maxAnimations}/`, (path) => {
            const parts: string[] = path.split("/");
            const animationIndex = Number(parts[2]);
            return this.world.animations[animationIndex] === undefined ? [null] : [`/animations/${animationIndex}/`];
        }, (path, value) => {
            //no-op
        }, "ref", true);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/matrix`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            
            const scaleMatrix = Matrix.Scaling(node.scaling.x, node.scaling.y, node.scaling.z);
            const rotationMatrix = Matrix.FromQuaternionToRef(node.rotationQuaternion, Matrix.Identity());
       
            const matrix: Matrix = scaleMatrix.multiply(rotationMatrix);
            matrix.setTranslation(new Vector3(node.position.x, node.position.y, node.position.z));
            
            return [
                matrix.m[0], matrix.m[1], matrix.m[2], matrix.m[3],
                matrix.m[4], matrix.m[5], matrix.m[6], matrix.m[7], 
                matrix.m[8], matrix.m[9], matrix.m[10], matrix.m[11],
                matrix.m[12], matrix.m[13], matrix.m[14], matrix.m[15]
            ];
        }, (path, value) => {
            //no-op
        }, "float4x4", true);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/globalMatrix`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];

            (node as AbstractMesh).computeWorldMatrix(true);
            const globalMatrix = (node as AbstractMesh).getWorldMatrix().asArray();
            return BabylonDecorator.toRightHandedMatrixArray(globalMatrix);
        }, (path, value) => {
            //no-op
        }, "float4x4", true);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/mesh`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            const candidates = this.world.meshes.includes(node) ? [node] : (node.getChildMeshes?.() ?? []);
            let meshIndex: number | undefined = undefined;
            for (const candidate of candidates) {
                const pointer = candidate._internalMetadata?.gltf?.pointers?.find((p: string) => meshPrimitivePointerRegex.test(p));
                if (pointer !== undefined) {
                    meshIndex = Number(pointer.match(meshPrimitivePointerRegex)![1]);
                    break;
                }
            }
            return [meshIndex === undefined ? null : `/meshes/${meshIndex}/`];
        }, (path, value) => {
            //no-op
        }, "ref", true);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/children/${maxGltfNode}`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            const child = node.getChildren()[Number(parts[4])];
            const childIndex = this.world.glTFNodes.indexOf(child);
            return [childIndex === -1 ? null : `/nodes/${childIndex}/`];
        }, (path, value) => {
            //no-op
        }, "ref", true);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/children.length`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            return [node.getChildren().filter((c: Node) => this.world.glTFNodes.indexOf(c) !== -1).length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer(`/meshes/${maxGlTFMeshIndex}/primitives/${maxGltfNode}/material`, (path) => {
            const parts: string[] = path.split("/");
            const primitive = getMeshPrimitives(Number(parts[2]))[Number(parts[4])];
            if (primitive === undefined || primitive.babylonMesh.material == null) {
                return [null];
            }
            const materialIndex = this.world.materials.indexOf(primitive.babylonMesh.material);
            return [materialIndex === -1 ? null : `/materials/${materialIndex}/`];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const primitive = getMeshPrimitives(Number(parts[2]))[Number(parts[4])];
            if (primitive === undefined) return;
            const materialIndex = typeof value === "string"
                ? Number(value.split("/").filter((p: string) => p !== "").pop())
                : Number(value);
            primitive.babylonMesh.material = this.world.materials[materialIndex];
        }, "ref", true);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/camera`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])] as Node;
            const cameraChild = node.getChildren().find((child: Node) => child instanceof Camera) as any;
            const pointer = cameraChild?._internalMetadata?.gltf?.pointers?.find((p: string) => cameraPointerRegex.test(p));
            return [pointer === undefined ? null : `${pointer}/`];
        }, (path, value) => {
            //no-op
        }, "ref", true);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/parent`, (path) => {
            const parts: string[] = path.split("/");
            const parentIndex = this.getParentNodeIndex(Number(parts[2]));
            return [parentIndex === undefined ? null : `/nodes/${parentIndex}/`];
        }, (path, value) => {
            //no-op
        }, "ref", true);

        const maxNodeWeight: number = Math.max(0, ...this.world.glTFNodes.map((n: any) => (n.morphTargetManager?.numTargets ?? 0) - 1));
        this.registerJsonPointer(`/nodes/${maxGltfNode}/weights/${maxNodeWeight}`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])] as any;
            const target = node.morphTargetManager?.getTarget(Number(parts[4]));
            return target === undefined ? [NaN] : [target.influence];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])] as any;
            const target = node.morphTargetManager?.getTarget(Number(parts[4]));
            if (target !== undefined) target.influence = value;
        }, "float", false);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/weights.length`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])] as any;
            return [node.morphTargetManager?.numTargets ?? 0];
        }, (path, value) => {
            //no-op
        }, "int", true);

        const maxMeshWeight: number = Math.max(0, ...glTFMeshPrimitives.map(p => (p.babylonMesh.morphTargetManager?.numTargets ?? 0) - 1));
        this.registerJsonPointer(`/meshes/${maxGlTFMeshIndex}/weights/${maxMeshWeight}`, (path) => {
            const parts: string[] = path.split("/");
            const primitive = getMeshPrimitives(Number(parts[2]))[0];
            const target = primitive?.babylonMesh.morphTargetManager?.getTarget(Number(parts[4]));
            return target === undefined ? [NaN] : [target.influence];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            for (const primitive of getMeshPrimitives(Number(parts[2]))) {
                const target = primitive.babylonMesh.morphTargetManager?.getTarget(Number(parts[4]));
                if (target !== undefined) target.influence = value;
            }
        }, "float", false);

        this.registerJsonPointer(`/meshes/${maxGlTFMeshIndex}/weights.length`, (path) => {
            const parts: string[] = path.split("/");
            const primitive = getMeshPrimitives(Number(parts[2]))[0];
            return [primitive?.babylonMesh.morphTargetManager?.numTargets ?? 0];
        }, (path, value) => {
            //no-op
        }, "int", true);

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

        this.registerJsonPointer(`/animations/${maxAnimations}/extensions/KHR_interactivity/playhead`, (path) => {
            const parts: string[] = path.split("/");
            const animation: AnimationGroup = this.world.animations[Number(parts[2])];
            const animationInstance: AnimationGroup = animation?.metadata?.instance;
            if (animationInstance === undefined || animationInstance.animatables[0] === undefined) {return [NaN]}
            const masterFrame = animationInstance.animatables[0].masterFrame;
            const fps = 60;
            return [masterFrame / fps];
        }, (path, value) => {
            //no-op
        }, "float", true);

        // TODO: virtual playhead isnt something that is really stored on animations, ask babylon js to add it if we really need it 
        this.registerJsonPointer(`/animations/${maxAnimations}/extensions/KHR_interactivity/virtualPlayhead`, (path) => {
            const parts: string[] = path.split("/");
            const animation: AnimationGroup = this.world.animations[Number(parts[2])];
            const animationInstance: AnimationGroup = animation?.metadata?.instance;
            if (animationInstance === undefined || animationInstance.animatables[0] === undefined) {return [NaN]}
            const masterFrame = animationInstance.animatables[0].masterFrame;
            const fps = 60;
            return [masterFrame / fps];
        }, (path, value) => {
            //no-op
        }, "float", true);

        const lightPointerRegex = /^\/extensions\/KHR_lights_punctual\/lights\/\d+$/;
        const glTFLights = this.scene.lights
            .filter((l: any) => l._internalMetadata?.gltf?.pointers?.some((p: string) => lightPointerRegex.test(p)))
            .sort((a: any, b: any) => {
                const aIndex = Number(a._internalMetadata.gltf.pointers.find((p: string) => lightPointerRegex.test(p)).split("/").pop());
                const bIndex = Number(b._internalMetadata.gltf.pointers.find((p: string) => lightPointerRegex.test(p)).split("/").pop());
                return aIndex - bIndex;
            });
        const maxLight: number = Math.max(0, glTFLights.length - 1);

        this.registerJsonPointer(`/extensions/KHR_lights_punctual/lights/${maxLight}/color`, (path) => {
            const parts: string[] = path.split("/");
            const color = glTFLights[Number(parts[4])]?.diffuse;
            return color === undefined ? [NaN, NaN, NaN] : [color.r, color.g, color.b];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const light = glTFLights[Number(parts[4])];
            if (light !== undefined) light.diffuse = new Color3(value[0], value[1], value[2]);
        }, "float3", false);

        this.registerJsonPointer(`/extensions/KHR_lights_punctual/lights/${maxLight}/intensity`, (path) => {
            const parts: string[] = path.split("/");
            const intensity = glTFLights[Number(parts[4])]?.intensity;
            return intensity === undefined ? [NaN] : [intensity];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const light = glTFLights[Number(parts[4])];
            if (light !== undefined) light.intensity = value;
        }, "float", false);

        this.registerJsonPointer(`/extensions/KHR_lights_punctual/lights/${maxLight}/range`, (path) => {
            const parts: string[] = path.split("/");
            const range = glTFLights[Number(parts[4])]?.range;
            return range === undefined ? [NaN] : [range];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const light = glTFLights[Number(parts[4])];
            if (light !== undefined) light.range = value;
        }, "float", false);

        this.registerJsonPointer(`/extensions/KHR_lights_punctual/lights/${maxLight}/spot/innerConeAngle`, (path) => {
            const parts: string[] = path.split("/");
            const light = glTFLights[Number(parts[4])];
            return light instanceof SpotLight ? [light.innerAngle / 2] : [NaN];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const light = glTFLights[Number(parts[4])];
            if (light instanceof SpotLight) light.innerAngle = value * 2;
        }, "float", false);

        this.registerJsonPointer(`/extensions/KHR_lights_punctual/lights/${maxLight}/spot/outerConeAngle`, (path) => {
            const parts: string[] = path.split("/");
            const light = glTFLights[Number(parts[4])];
            return light instanceof SpotLight ? [light.angle / 2] : [NaN];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const light = glTFLights[Number(parts[4])];
            if (light instanceof SpotLight) light.angle = value * 2;
        }, "float", false);
    }

    private swimDownSelectability(node: Node, parentSelctability: boolean) {
        const curNodeSelectability = node.metadata.selectable ?? true;
        const propagatedSelectability = curNodeSelectability && parentSelctability;
        if (node instanceof AbstractMesh) {
            (node as AbstractMesh).isPickable = propagatedSelectability;
        }
        for (const child of node.getChildren()) {
            this.swimDownSelectability(child, propagatedSelectability);
        }
    }

    private swimDownHoverability(node: Node, parentHoverability: boolean) {
        const curNodeHoverability = node.metadata.hoverable ?? true;
        const propagatedHoverability = curNodeHoverability && parentHoverability;
        node.metadata.compositeHoverability = propagatedHoverability;
        for (const child of node.getChildren()) {
            this.swimDownHoverability(child, propagatedHoverability);
        }
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
        const frame = animationInstance.animatables[0].animationStarted ? animationInstance.animatables[0].masterFrame : animationInstance.animatables[0].fromFrame;
        const fps = 60;
        const stopFrame = stopTime * fps;
        if ((forward && (stopFrame < animationInstance.animatables[0].fromFrame || stopFrame > animationInstance.animatables[0].toFrame) ||
            (!forward && (stopFrame > animationInstance.animatables[0].fromFrame || stopFrame < animationInstance.animatables[0].toFrame)))) {
            //no-op since we are outside the animation range
            return;
        }
        if ((forward && stopFrame <= frame) || (!forward && stopFrame >= frame)) {
            //snap to stop frame if we have passed it
            animationInstance.goToFrame(stopFrame);
            animationInstance.stop();
            animationInstance.dispose();
            callback();
            return;
        }
        this._animateRange(animationInstance.speedRatio, forward, false, frame, stopFrame, frame, animation, () => callback(), undefined);
    }

    private _animateRange = (speed: float, isForward: boolean, isLoop: boolean, startFrame: float, endFrame: float, currentFrame: float,
                             animation: AnimationGroup, endCallback: (() => void) | undefined, loopCallback: (() => void )| undefined) => {
        if (animation.metadata.instance !== undefined) {
            //clear any previous animation
            if (animation.metadata.instance.isPlaying) {
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
