import {ADecorator} from "./ADecorator";
import {BehaveEngineNode, IFlow} from "../BehaveEngineNode";
import {IBehaveEngine} from "../IBehaveEngine";
import {
    AbstractMesh,
    AnimationGroup, Camera, Color3,
    float,
    Matrix, PBRMaterial,
    PointerEventTypes,
    Quaternion,
    TargetCamera
} from "@babylonjs/core";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {cubicBezier, easeFloat, easeFloat3, easeFloat4, linearFloat, slerpFloat4} from "../easingUtils";
import {Scene} from "@babylonjs/core/scene";
import {OnSelect} from "../nodes/experimental/OnSelect";
import {KHR_materials_variants} from "@babylonjs/loaders/glTF/2.0";
import {AnimationStart} from "../nodes/animation/AnimationStart";
import {AnimationStop} from "../nodes/animation/AnimationStop";
import {AnimationStopAt} from "../nodes/animation/AnimationStopAt";
import {Nullable} from "@babylonjs/core/types.js";

export class BabylonDecorator extends ADecorator {
    scene: Scene;
    world: any

    constructor(behaveEngine: IBehaveEngine, world: any, scene: Scene) {
        super(behaveEngine);
        this.world = world;
        this.scene = scene;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.extractBehaveGraphFromScene = this.extractBehaveGraphFromScene
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.alertParentOnSelect = this.alertParentOnSelect
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.addNodeClickedListener = this.addNodeClickedListener
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.stopAnimation = this.stopAnimation
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.stopAnimationAt = this.stopAnimationAt
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.startAnimation = this.startAnimation

        this.behaveEngine.animateProperty = this.animateProperty
        this.behaveEngine.animateCubicBezier = this.animateCubicBezier;
        this.behaveEngine.getWorld = this.getWorld;
        this.registerKnownPointers();
        this.registerBehaveEngineNode("node/onSelect", OnSelect);
        this.registerBehaveEngineNode("animation/stop", AnimationStop);
        this.registerBehaveEngineNode("animation/start", AnimationStart);
        this.registerBehaveEngineNode("animation/stopAt", AnimationStopAt);
    }

    processAddingNodeToQueue = (flow: IFlow) => {
        //pass
    }

    processExecutingNextNode = (flow: IFlow) => {
        //pass
    }

    processNodeStarted = (node: BehaveEngineNode) => {
        //pass
    }

    getWorld = (): any => {
        return this.world;
    }

    animateProperty = (path: string, easingParameters: any, callback: () => void) => {
        this.behaveEngine.getWorldAnimationPathCallback(path)?.cancel();
        const startTime = Date.now();

        const action = async () => {
            const elapsedDuration = (Date.now() - startTime) / 1000;
            const t = Math.min(elapsedDuration / easingParameters.easingDuration, 1);
            if (easingParameters.valueType === "float3") {
                const v = easeFloat3(t, easingParameters);
                console.log(v);
                this.behaveEngine.setPathValue(path, v);
            } else if (easingParameters.valueType === "float4") {
                this.behaveEngine.setPathValue(path, easeFloat4(t, easingParameters));
            } else if (easingParameters.valueType === "float") {
                this.behaveEngine.setPathValue(path, easeFloat(t, easingParameters));
            }

            if (elapsedDuration >= easingParameters.easingDuration) {
                this.behaveEngine.setPathValue(path, easingParameters.targetValue);
                this.scene.unregisterBeforeRender(action);
                callback()
            }
        }

        this.scene.registerBeforeRender(action);
        const cancel = () => {
            this.scene.unregisterBeforeRender(action);
            this.behaveEngine.setWorldAnimationPathCallback(path, undefined);
        }
        this.setWorldAnimationPathCallback(path, {cancel: cancel} );
    }

    animateCubicBezier = (
        path: string,
        p1: number[],
        p2: number[],
        initialValue: any,
        targetValue: any,
        duration: number,
        valueType: string,
        callback: () => void
    ) => {
        this.behaveEngine.getWorldAnimationPathCallback(path)?.cancel();
        const startTime = Date.now();

        const action = async () => {
            const elapsedDuration = (Date.now() - startTime) / 1000;
            const t = Math.min(elapsedDuration / duration, 1);
            const p = cubicBezier(t, {x: 0, y:0}, {x: p1[0], y:p1[1]}, {x: p2[0], y:p2[1]}, {x: 1, y:1});
            if (valueType === "float3") {
                const value = [linearFloat(p.y, initialValue[0], targetValue[0]), linearFloat(p.y, initialValue[1], targetValue[1]), linearFloat(p.y, initialValue[2], targetValue[2])]
                this.behaveEngine.setPathValue(path, value);
            } else if (valueType === "float4") {
                //TODO: pass in if this should be slerped or not
                const value = slerpFloat4(t, initialValue, targetValue);
                this.behaveEngine.setPathValue(path, value);
            } else if (valueType === "float") {
                const value = [linearFloat(p.y, initialValue[0], targetValue[0])]
                this.behaveEngine.setPathValue(path, value);
            }

            if (elapsedDuration >= duration) {
                this.behaveEngine.setPathValue(path, targetValue);
                this.scene.unregisterBeforeRender(action);
                callback()
            }
        }

        this.scene.registerBeforeRender(action);
        const cancel = () => {
            this.scene.unregisterBeforeRender(action);
            this.behaveEngine.setWorldAnimationPathCallback(path, undefined);
        }
        this.setWorldAnimationPathCallback(path, {cancel: cancel} );
    }

    registerJsonPointer = (jsonPtr: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string) => {
        this.behaveEngine.registerJsonPointer(jsonPtr, getterCallback, setterCallback, typeName);
    };

    registerKnownPointers = () => {
        const maxGltfNode:number = this.world.glTFNodes.length-1;
        const maxGlTFMaterials: number = this.world.materials.length-1;

        this.registerJsonPointer(`/nodes/${maxGltfNode}/scale`, (path) => {
            const parts: string[] = path.split("/");
            return [(this.world.glTFNodes[Number(parts[2])] as AbstractMesh).scaling.x,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).scaling.y,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).scaling.z];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).scaling = new Vector3(value[0], value[1], value[2]);
        }, "float3")

        this.registerJsonPointer(`/nodes/${maxGltfNode}/translation`, (path) => {
            const parts: string[] = path.split("/");
            return [(this.world.glTFNodes[Number(parts[2])] as AbstractMesh).position.x,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).position.y,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).position.z];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).position= new Vector3(value[0], value[1], value[2]);
        }, "float3")

        this.registerJsonPointer(`/nodes/${maxGltfNode}/rotation`, (path) => {
            const parts: string[] = path.split("/");
            return [
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).rotationQuaternion?.w,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).rotationQuaternion?.x,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).rotationQuaternion?.y,
                (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).rotationQuaternion?.z];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.glTFNodes[Number(parts[2])] as AbstractMesh).rotationQuaternion = new Quaternion(value[1], value[2], value[3], value[0]);
        }, "float4");

        this.registerJsonPointer(`/activeCamera/rotation`, (path) => {
            const activeCamera: Nullable<Camera> = this.scene.activeCamera;
            if (activeCamera === null || !(activeCamera instanceof TargetCamera)) {
                return [NaN, NaN, NaN, NaN]
            }

            return [activeCamera.rotationQuaternion.w, activeCamera.rotationQuaternion.x, activeCamera.rotationQuaternion.y, activeCamera.rotationQuaternion.z]
        }, (path, value) => {
            //no-op
        }, "float4")

        this.registerJsonPointer(`/activeCamera/position`, (path) => {
            const activeCamera: Nullable<Camera> = this.scene.activeCamera;
            if (activeCamera === null) {
                return [NaN, NaN, NaN]
            }

            return [activeCamera.position.x, activeCamera.position.y, activeCamera.position.z]
        }, (path, value) => {
            //no-op
        }, "float3")

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
        }, "int");

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
        }, "float4");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/roughnessFactor`, (path) => {
            const parts: string[] = path.split("/");
            const roughness = (this.world.materials[Number(parts[2])] as PBRMaterial).roughness;
            return roughness === null ? [NaN] : [roughness];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as PBRMaterial;
            material.roughness = value;
        }, "float");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/metallicFactor`, (path) => {
            const parts: string[] = path.split("/");
            const metallic = (this.world.materials[Number(parts[2])] as PBRMaterial).metallic;
            return metallic === null ? [NaN] : [metallic];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as PBRMaterial;
            material.metallic = value;
        }, "float");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/alphaCutoff`, (path) => {
            const parts: string[] = path.split("/");
            const alphaCutoff = (this.world.materials[Number(parts[2])]).alphaCutoff;
            return alphaCutoff === null ? [NaN] : [alphaCutoff];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])];
            material.alphaCutoff = value;
        }, "float");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/emissiveFactor`, (path) => {
            const parts: string[] = path.split("/");
            const emissiveFactor = (this.world.materials[Number(parts[2])]).emissiveFactor;
            return emissiveFactor === undefined ? [NaN, NaN, NaN] : [emissiveFactor[0], emissiveFactor[1], emissiveFactor[2]];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])];
            material.emissiveFactor = value;
        }, "float3");

        //TODO: find babylon mapping for /materials/{}/normalTexture/scale

        //TODO: find babylon mapping for /materials/{}/occlusionTexture/strength


        // BASE COLOR TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const baseColorTexture = this.world.materials[Number(parts[2])].albedoTexture;
            if (baseColorTexture === null) {
                return [NaN, NaN];
            }

            return [baseColorTexture.uOffset, baseColorTexture.vOffset]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const baseColorTexture = this.world.materials[Number(parts[2])].albedoTexture;
            if (baseColorTexture !== null) {
                baseColorTexture.uOffset = value[0];
                baseColorTexture.vOffset = value[1];
            }
        }, "float2");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const baseColorTexture = this.world.materials[Number(parts[2])].albedoTexture;
            if (baseColorTexture === null) {
                return [NaN, NaN];
            }

            return [baseColorTexture.uScale, baseColorTexture.vScale]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const baseColorTexture = this.world.materials[Number(parts[2])].albedoTexture;
            if (baseColorTexture !== null) {
                baseColorTexture.uScale = value[0];
                baseColorTexture.vScale = value[1];
            }
        }, "float2");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const baseColorTexture = this.world.materials[Number(parts[2])].albedoTexture;
            if (baseColorTexture === null) {
                return [NaN];
            }

            // is negated in babylon's loading so negating when getting https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/loaders/src/glTF/2.0/Extensions/KHR_texture_transform.ts#L73
            return [-1 * baseColorTexture.wAng]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const baseColorTexture = this.world.materials[Number(parts[2])].albedoTexture;
            if (baseColorTexture !== null) {
                // is negated in babylon's loading so negating when setting https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/loaders/src/glTF/2.0/Extensions/KHR_texture_transform.ts#L73
                baseColorTexture.wAng = -1 * value[0];
            }
        }, "float");

        // METALLIC ROUGHNESS TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/metallicRoughnessTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const metallicTexture = this.world.materials[Number(parts[2])].metallicTexture;
            if (metallicTexture === null) {
                return [NaN, NaN];
            }

            return [metallicTexture.uOffset, metallicTexture.vOffset]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const metallicTexture = this.world.materials[Number(parts[2])].metallicTexture;
            if (metallicTexture !== null) {
                metallicTexture.uOffset = value[0];
                metallicTexture.vOffset = value[1];
            }
        }, "float2");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/metallicRoughnessTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const metallicTexture = this.world.materials[Number(parts[2])].metallicTexture;
            if (metallicTexture === null) {
                return [NaN, NaN];
            }

            return [metallicTexture.uScale, metallicTexture.vScale]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const metallicTexture = this.world.materials[Number(parts[2])].metallicTexture;
            if (metallicTexture !== null) {
                metallicTexture.uScale = value[0];
                metallicTexture.vScale = value[1];
            }
        }, "float2");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/metallicRoughnessTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const metallicTexture = this.world.materials[Number(parts[2])].metallicTexture;
            if (metallicTexture === null) {
                return [NaN];
            }

            // is negated in babylon's loading so negating when getting https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/loaders/src/glTF/2.0/Extensions/KHR_texture_transform.ts#L73
            return [-1 * metallicTexture.wAng]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const metallicTexture = this.world.materials[Number(parts[2])].metallicTexture;
            if (metallicTexture !== null) {
                // is negated in babylon's loading so negating when setting https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/loaders/src/glTF/2.0/Extensions/KHR_texture_transform.ts#L73
                metallicTexture.wAng = -1 * value[0];
            }
        }, "float");

        // NORMAL TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/normalTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].normalTexture;
            if (normalTexture === null) {
                return [NaN, NaN];
            }

            return [normalTexture.uOffset, normalTexture.vOffset]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].normalTexture;
            if (normalTexture !== null) {
                normalTexture.uOffset = value[0];
                normalTexture.vOffset = value[1];
            }
        }, "float2");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/normalTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].normalTexture;
            if (normalTexture === null) {
                return [NaN, NaN];
            }

            return [normalTexture.uScale, normalTexture.vScale]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].normalTexture;
            if (normalTexture !== null) {
                normalTexture.uScale = value[0];
                normalTexture.vScale = value[1];
            }
        }, "float2");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/normalTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].normalTexture;
            if (normalTexture === null) {
                return [NaN];
            }

            // is negated in babylon's loading so negating when getting https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/loaders/src/glTF/2.0/Extensions/KHR_texture_transform.ts#L73
            return [-1 * normalTexture.wAng]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const normalTexture = this.world.materials[Number(parts[2])].normalTexture;
            if (normalTexture !== null) {
                // is negated in babylon's loading so negating when setting https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/loaders/src/glTF/2.0/Extensions/KHR_texture_transform.ts#L73
                normalTexture.wAng = -1 * value[0];
            }
        }, "float");

        // OCCLUSION TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/occlusionTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].occlusionTexture;
            if (occlusionTexture === null) {
                return [NaN, NaN];
            }

            return [occlusionTexture.uOffset, occlusionTexture.vOffset]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].occlusionTexture;
            if (occlusionTexture !== null) {
                occlusionTexture.uOffset = value[0];
                occlusionTexture.vOffset = value[1];
            }
        }, "float2");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/occlusionTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].occlusionTexture;
            if (occlusionTexture === null) {
                return [NaN, NaN];
            }

            return [occlusionTexture.uScale, occlusionTexture.vScale]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].occlusionTexture;
            if (occlusionTexture !== null) {
                occlusionTexture.uScale = value[0];
                occlusionTexture.vScale = value[1];
            }
        }, "float2");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/occlusionTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].occlusionTexture;
            if (occlusionTexture === null) {
                return [NaN];
            }

            // is negated in babylon's loading so negating when getting https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/loaders/src/glTF/2.0/Extensions/KHR_texture_transform.ts#L73
            return [-1 * occlusionTexture.wAng]
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const occlusionTexture = this.world.materials[Number(parts[2])].occlusionTexture;
            if (occlusionTexture !== null) {
                // is negated in babylon's loading so negating when setting https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/loaders/src/glTF/2.0/Extensions/KHR_texture_transform.ts#L73
                occlusionTexture.wAng = -1 * value[0];
            }
        }, "float");

        // EMISSIVE TEXTURE TRANSFORM
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/emissiveTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const emissiveTexture = this.world.materials[Number(parts[2])].emissiveTexture;
            if (emissiveTexture === null) {
                return [NaN, NaN];
            }

            return [emissiveTexture.uOffset, emissiveTexture.vOffset];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const emissiveTexture = this.world.materials[Number(parts[2])].emissiveTexture;
            if (emissiveTexture !== null) {
                emissiveTexture.uOffset = value[0];
                emissiveTexture.vOffset = value[1];
            }
        }, "float2");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/emissiveTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const emissiveTexture = this.world.materials[Number(parts[2])].emissiveTexture;
            if (emissiveTexture === null) {
                return [NaN, NaN];
            }

            return [emissiveTexture.uScale, emissiveTexture.vScale];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const emissiveTexture = this.world.materials[Number(parts[2])].emissiveTexture;
            if (emissiveTexture !== null) {
                emissiveTexture.uScale = value[0];
                emissiveTexture.vScale = value[1];
            }
        }, "float2");

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/emissiveTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const emissiveTexture = this.world.materials[Number(parts[2])].emissiveTexture;
            if (emissiveTexture === null) {
                return [NaN];
            }

            // is negated in babylon's loading so negating when getting https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/loaders/src/glTF/2.0/Extensions/KHR_texture_transform.ts#L73
            return [-1 * emissiveTexture.wAng];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const emissiveTexture = this.world.materials[Number(parts[2])].emissiveTexture;
            if (emissiveTexture !== null) {
                // is negated in babylon's loading so negating when setting https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/loaders/src/glTF/2.0/Extensions/KHR_texture_transform.ts#L73
                emissiveTexture.wAng = -1 * value[0];
            }
        }, "float");


    }

    public extractBehaveGraphFromScene = (): any => {
        if ((this.scene as never)['extras'] === undefined || (this.scene as never)['extras']['behaveGraph'] === undefined) {
            console.info('No behavior found in scene');
            return;
        }

        return (this.scene as never)['extras']['behaveGraph'];
    };

    public addNodeClickedListener = (nodeIndex: number, callback: (localHitLocation: number[], hitNodeIndex: number) => void): void => {
        this.world.glTFNodes[nodeIndex].metadata = this.world.glTFNodes[nodeIndex].metadata || {};
        this.world.glTFNodes[nodeIndex].metadata.onSelectCallback = callback;

        this.scene.onPointerObservable.add(async (pointerInfo) => {
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
                const targetMesh: AbstractMesh = this.world.glTFNodes[nodeIndex];
                if (targetMesh !== hit.pickedMesh && targetMesh.id !== hit.pickedMesh.id && (!targetMesh.getChildMeshes(false).includes(hit.pickedMesh))) {
                    return;
                } else if (targetMesh.getChildMeshes(false).includes(hit.pickedMesh) && hit.pickedMesh.metadata.onSelectCallback != null) {
                    return;
                } else {
                    const pos = [hit.pickedMesh.position.x, hit.pickedMesh.position.y, hit.pickedMesh.position.z];
                    const hitNodeIndex = this.world.glTFNodes.findIndex((value: { uniqueId: number; }) => value.uniqueId === hit.pickedMesh!.uniqueId)
                    callback(pos, hitNodeIndex);
                }
            }
        });
    }

    public alertParentOnSelect = (localHitLocation: number[], hitNodeIndex: number, childNodeIndex: number): void => {
        let curNode = this.world.glTFNodes[childNodeIndex].parent;
        while (curNode !== null && (curNode.metadata == null || curNode.metadata.onSelectCallback == null)) {
            curNode = curNode.parent;
        }

        if (curNode !== null) {
            curNode.metadata.onSelectCallback(localHitLocation, hitNodeIndex);
        }
    }

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
                            this._animateRange(speed, true, false, anim.from, endFrame % anim.to, anim.from, anim,
                                callback, undefined);
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
        const animationInstance: AnimationGroup = animation.metadata.instance;
        if (animationInstance === undefined) return;

        animationInstance.stop();
        animationInstance.dispose();
        animation.metadata.instance = undefined;
    }

    public stopAnimationAt = (animationIndex: number, stopTime: number , callback: () => void): void => {
        const animation: AnimationGroup = this.world.animations[animationIndex]
        const animationInstance: AnimationGroup = animation.metadata.instance;
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
