/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { ADecorator } from "../BasicBehaveEngine/ADecorator";
import { BehaveEngineNode } from "../BasicBehaveEngine/BehaveEngineNode";
import { IBehaveEngine, IInterpolateAction } from "../BasicBehaveEngine/IBehaveEngine";
import { IInteractivityFlow } from "../BasicBehaveEngine/types/InteractivityGraph";
import { glTFSchemaMetadata } from "./generated/glTFSchemaMetadata";

type PointerGetter = () => any;
type PointerSetter = (value: any) => void;

interface PointerBinding {
    get: PointerGetter;
    set: PointerSetter;
    typeName: string;
    readOnly: boolean;
}

interface GeneratedPointerDefinition {
    template: string;
    segments: readonly string[];
    typeName: string;
    readOnly: boolean;
    defaultValue?: any;
    extension?: string;
    requiredParentSegments?: readonly string[];
}

export interface GlTFObjectModel {
    nodes: any[];
    parents: Record<number, number>;
    materials: any[];
    meshes: any[];
    cameras: any[];
    skins: any[];
    scenes: any[];
    animations: any[];
    lights: any[];
    scene: number;
    extensions: any;
}

interface RuntimeAnimationChannel {
    targetNode: number;
    targetPath: string;
    interpolation: string;
    input: number[];
    output: number[][];
}

const SCHEMA_DEFAULTS = glTFSchemaMetadata.defaultBySchemaPointer as Record<string, any>;
const MATERIAL_POINTERS = glTFSchemaMetadata.materialPointers as readonly GeneratedPointerDefinition[];
const NODE_EXTENSION_POINTERS = glTFSchemaMetadata.nodeExtensionPointers as readonly GeneratedPointerDefinition[];
const schemaDefault = <T,>(schemaPath: string, propertyPath: string, fallback: T): T => (
    cloneValue(SCHEMA_DEFAULTS[`${schemaPath}#/properties/${propertyPath}`] ?? fallback)
);

const CORE = "specification/2.0/schema";
const KHR = "extensions/2.0/Khronos";

export class GlTFObjectModelDecorator extends ADecorator {
    protected objectModel: GlTFObjectModel;
    private pointerBindings = new Map<string, PointerBinding>();
    private activeAnimations = new Map<number, { timeout: ReturnType<typeof setTimeout>; startTime: number; endTime: number; speed: number; startedAt: number; token: number }>();
    private animationToken = 0;

    constructor(behaveEngine: IBehaveEngine, objectModel: Partial<GlTFObjectModel> = {}) {
        super(behaveEngine);
        this.objectModel = completeGlTFObjectModel(objectModel);
        this.behaveEngine.resolveRef = this.resolveRef;
        this.bridgeObjectModelHooks();
        this.bridgeEngineHooks();
        this.registerKnownPointers();
    }

    resolveRef = (ref: any): any => {
        if (ref == null || ref === "") {
            return -1;
        }
        const parts = String(ref).split("/").filter(Boolean);
        return parts.length === 0 ? -1 : parts[parts.length - 1];
    };

    processNodeStarted = (_node: BehaveEngineNode): void => undefined;
    processAddingNodeToQueue = (_flow: IInteractivityFlow): void => undefined;
    processExecutingNextNode = (_flow: IInteractivityFlow): void => undefined;
    startAnimation = (animationIndex: number, startTime: number, endTime: number, speed: number, callback: () => void): void => {
        this.clearActiveAnimation(animationIndex);
        const animation = this.objectModel.animations[animationIndex];
        animation.isPlaying = true;
        animation.virtualPlayhead = startTime;
        animation.playhead = effectiveAnimationTime(animation, startTime);
        this.applyAnimation(animationIndex, startTime);

        const duration = Math.abs(endTime - startTime) / speed;
        const token = ++this.animationToken;
        const timeout = setTimeout(() => {
            if (this.activeAnimations.get(animationIndex)?.token !== token) {
                return;
            }
            animation.isPlaying = false;
            animation.virtualPlayhead = endTime;
            animation.playhead = effectiveAnimationTime(animation, endTime);
            this.applyAnimation(animationIndex, endTime);
            this.activeAnimations.delete(animationIndex);
            callback();
        }, Math.max(0, duration * 1000));

        this.activeAnimations.set(animationIndex, { timeout, startTime, endTime, speed, startedAt: performance.now(), token });
    };
    stopAnimation = (animationIndex: number): void => {
        const animation = this.objectModel.animations[animationIndex];
        const currentTime = this.currentAnimationTime(animationIndex);
        this.clearActiveAnimation(animationIndex);
        if (animation !== undefined) {
            animation.isPlaying = false;
            animation.virtualPlayhead = currentTime;
            animation.playhead = effectiveAnimationTime(animation, currentTime);
            this.applyAnimation(animationIndex, currentTime);
        }
    };
    stopAnimationAt = (animationIndex: number, stopTime: number, callback: () => void): void => {
        const activeAnimation = this.activeAnimations.get(animationIndex);
        const animation = this.objectModel.animations[animationIndex];
        if (activeAnimation === undefined || animation === undefined) {
            return;
        }

        clearTimeout(activeAnimation.timeout);
        const currentTime = this.currentAnimationTime(animationIndex);
        const remainingSeconds = Math.max(0, Math.abs(stopTime - currentTime) / activeAnimation.speed);
        const token = ++this.animationToken;
        const timeout = setTimeout(() => {
            if (this.activeAnimations.get(animationIndex)?.token !== token) {
                return;
            }
            animation.isPlaying = false;
            animation.virtualPlayhead = stopTime;
            animation.playhead = effectiveAnimationTime(animation, stopTime);
            this.applyAnimation(animationIndex, stopTime);
            this.activeAnimations.delete(animationIndex);
            callback();
        }, remainingSeconds * 1000);
        this.activeAnimations.set(animationIndex, { ...activeAnimation, timeout, token });
    };
    getWorld = (): GlTFObjectModel => this.objectModel;
    getParentNodeIndex = (nodeIndex: number): number | undefined => this.objectModel.parents[nodeIndex];

    registerKnownPointers = (): void => {
        this.registerScenePointers();
        this.registerNodePointers();
        this.registerMeshPointers();
        this.registerMaterialPointers();
        this.registerCameraPointers();
        this.registerSkinPointers();
        this.registerLightPointers();
        this.registerAnimationPointers();
        this.registerInteractivityEventPointers();
    };

    private bridgeObjectModelHooks(): void {
        this.behaveEngine.isValidJsonPtr = this.isValidJsonPtr;
        this.behaveEngine.isReadOnly = this.isReadOnly;
        this.behaveEngine.getPathValue = this.getPathValue;
        this.behaveEngine.getPathtypeName = this.getPathtypeName;
        this.behaveEngine.setPathValue = this.setPathValue;
        this.behaveEngine.getRegisteredJsonPointers = this.getRegisteredJsonPointers;
    }

    isValidJsonPtr = (path: string): boolean => this.pointerBindings.has(path) || this.isActiveDelayRef(path);
    isReadOnly = (path: string): boolean => this.pointerBindings.get(path)?.readOnly ?? this.isActiveDelayRef(path);
    getPathValue = (path: string): any => {
        this.updateActiveAnimations();
        return this.pointerBindings.get(path)?.get() ?? (this.isActiveDelayRef(path) ? [path] : undefined);
    };
    getPathtypeName = (path: string): string | undefined => this.pointerBindings.get(path)?.typeName ?? (this.isActiveDelayRef(path) ? "ref" : undefined);
    setPathValue = (path: string, value: any): void => {
        const binding = this.pointerBindings.get(path);
        if (binding && !binding.readOnly) {
            binding.set(value);
        }
    };
    getRegisteredJsonPointers = (): string[] => [...this.pointerBindings.keys()].sort();

    setPointerInterpolationCallback(path: string, action: IInterpolateAction): void {
        this.behaveEngine.setPointerInterpolationCallback(path, action);
    }

    clearPointerInterpolation(path: string): void {
        this.behaveEngine.clearPointerInterpolation(path);
    }

    private pointer(path: string, typeName: string, get: PointerGetter, set: PointerSetter = ignoreSet, readOnly = false): void {
        this.pointerBindings.set(path, { get, set, typeName, readOnly });
        this.registerJsonPointer(path, () => this.getPathValue(path), (_path, value) => this.setPathValue(path, value), typeName, readOnly);
    }

    private scalarPointer(path: string, typeName: string, get: PointerGetter, set: PointerSetter = ignoreSet, readOnly = false): void {
        this.pointer(path, typeName, () => [get()], (value) => set(scalar(value)), readOnly);
    }

    private generatedPointer(target: any, concretePath: string, definition: GeneratedPointerDefinition): void {
        const segments = [...definition.segments];
        const defaultValue = Object.prototype.hasOwnProperty.call(definition, "defaultValue")
            ? definition.defaultValue
            : undefined;
        const get = () => getDefaulted(target, segments, defaultValue);
        const set = (value: any) => setPath(target, segments, isScalarType(definition.typeName) ? scalar(value) : vector(value));

        if (isScalarType(definition.typeName)) {
            this.scalarPointer(concretePath, definition.typeName, get, set, definition.readOnly);
            return;
        }
        this.pointer(concretePath, definition.typeName, get, set, definition.readOnly);
    }

    private registerScenePointers(): void {
        this.scalarPointer("/animations.length", "int", () => this.objectModel.animations.length, ignoreSet, true);
        this.scalarPointer("/cameras.length", "int", () => this.objectModel.cameras.length, ignoreSet, true);
        this.scalarPointer("/materials.length", "int", () => this.objectModel.materials.length, ignoreSet, true);
        this.scalarPointer("/meshes.length", "int", () => this.objectModel.meshes.length, ignoreSet, true);
        this.scalarPointer("/nodes.length", "int", () => this.objectModel.nodes.length, ignoreSet, true);
        this.scalarPointer("/scene", "int", () => this.objectModel.scene, ignoreSet, true);
        this.scalarPointer("/scenes.length", "int", () => this.objectModel.scenes.length, ignoreSet, true);
        this.scalarPointer("/skins.length", "int", () => this.objectModel.skins.length, ignoreSet, true);

        this.objectModel.scenes.forEach((scene, sceneIndex) => {
            const nodes = scene.nodes ?? [];
            this.scalarPointer(`/scenes/${sceneIndex}/nodes.length`, "int", () => nodes.length, ignoreSet, true);
            nodes.forEach((nodeIndex: number, childIndex: number) => {
                this.pointer(`/scenes/${sceneIndex}/nodes/${childIndex}`, "ref", () => [ref("nodes", nodeIndex)], ignoreSet, true);
            });
        });
    }

    private registerNodePointers(): void {
        this.objectModel.nodes.forEach((node, nodeIndex) => {
            this.pointer(`/nodes/${nodeIndex}/translation`, "float3", () => node.translation, (value) => node.translation = vector(value));
            if (node.matrix === undefined) {
                this.pointer(`/nodes/${nodeIndex}/rotation`, "float4", () => node.rotation, (value) => node.rotation = vector(value));
                this.pointer(`/nodes/${nodeIndex}/scale`, "float3", () => node.scale, (value) => node.scale = vector(value));
            }

            this.pointer(`/nodes/${nodeIndex}/matrix`, "float4x4", () => this.localMatrix(nodeIndex), ignoreSet, true);
            this.pointer(`/nodes/${nodeIndex}/globalMatrix`, "float4x4", () => this.globalMatrix(nodeIndex), ignoreSet, true);
            this.scalarPointer(`/nodes/${nodeIndex}/children.length`, "int", () => node.children.length, ignoreSet, true);
            node.children.forEach((childNodeIndex: number, childIndex: number) => {
                this.pointer(`/nodes/${nodeIndex}/children/${childIndex}`, "ref", () => [ref("nodes", childNodeIndex)], ignoreSet, true);
            });

            if (node.mesh !== undefined) {
                this.pointer(`/nodes/${nodeIndex}/mesh`, "ref", () => [ref("meshes", node.mesh)], ignoreSet, true);
            }
            if (node.camera !== undefined) {
                this.pointer(`/nodes/${nodeIndex}/camera`, "ref", () => [ref("cameras", node.camera)], ignoreSet, true);
            }
            if (node.skin !== undefined) {
                this.pointer(`/nodes/${nodeIndex}/skin`, "ref", () => [ref("skins", node.skin)], ignoreSet, true);
            }
            if (this.objectModel.parents[nodeIndex] !== undefined) {
                this.pointer(`/nodes/${nodeIndex}/parent`, "ref", () => [ref("nodes", this.objectModel.parents[nodeIndex])], ignoreSet, true);
            }

            if (node.weights.length > 0) {
                this.pointer(`/nodes/${nodeIndex}/weights`, "float[]", () => node.weights, (value) => node.weights = vector(value));
                node.weights.forEach((_weight: number, weightIndex: number) => {
                    this.scalarPointer(`/nodes/${nodeIndex}/weights/${weightIndex}`, "float", () => node.weights[weightIndex], (value) => node.weights[weightIndex] = value);
                });
            }
            this.scalarPointer(`/nodes/${nodeIndex}/weights.length`, "int", () => node.weights.length, ignoreSet, true);

            for (const pointerDefinition of NODE_EXTENSION_POINTERS) {
                if (node.extensions?.[pointerDefinition.extension ?? ""] === undefined) {
                    continue;
                }
                this.generatedPointer(node, pointerDefinition.template.replace("{}", String(nodeIndex)), pointerDefinition);
            }
            if (node.extensions?.KHR_lights_punctual?.light !== undefined) {
                this.pointer(`/nodes/${nodeIndex}/extensions/KHR_lights_punctual/light`, "ref", () => [ref("extensions/KHR_lights_punctual/lights", node.extensions.KHR_lights_punctual.light)], ignoreSet, true);
            }
        });
    }

    private registerMeshPointers(): void {
        this.objectModel.meshes.forEach((mesh, meshIndex) => {
            this.scalarPointer(`/meshes/${meshIndex}/primitives.length`, "int", () => mesh.primitives.length, ignoreSet, true);
            mesh.primitives.forEach((primitive: any, primitiveIndex: number) => {
                if (primitive.material !== undefined) {
                    this.pointer(`/meshes/${meshIndex}/primitives/${primitiveIndex}/material`, "ref", () => [ref("materials", primitive.material)], ignoreSet, true);
                }
            });

            if (mesh.weights.length > 0) {
                mesh.weights.forEach((_weight: number, weightIndex: number) => {
                    this.scalarPointer(`/meshes/${meshIndex}/weights/${weightIndex}`, "float", () => mesh.weights[weightIndex], (value) => mesh.weights[weightIndex] = value);
                });
            }
            this.scalarPointer(`/meshes/${meshIndex}/weights.length`, "int", () => mesh.weights.length, ignoreSet, true);
        });
    }

    private registerMaterialPointers(): void {
        this.objectModel.materials.forEach((material, materialIndex) => {
            for (const pointerDefinition of MATERIAL_POINTERS) {
                if (pointerDefinition.extension && material.extensions?.[pointerDefinition.extension] === undefined) {
                    continue;
                }
                if (pointerDefinition.requiredParentSegments && getPath(material, [...pointerDefinition.requiredParentSegments]) === undefined) {
                    continue;
                }
                this.generatedPointer(material, pointerDefinition.template.replace("{}", String(materialIndex)), pointerDefinition);
            }
            this.registerTextureTransformPointers(material, materialIndex);
        });
    }

    private registerTextureTransformPointers(material: any, materialIndex: number): void {
        for (const texturePath of textureInfoPaths(material)) {
            const textureInfo = getPath(material, texturePath.split("/"));
            if (textureInfo === undefined) {
                continue;
            }
            const transformPath = [...texturePath.split("/"), "extensions", "KHR_texture_transform"];
            this.pointer(`/materials/${materialIndex}/${texturePath}/extensions/KHR_texture_transform/offset`, "float2", () => getDefaulted(material, [...transformPath, "offset"], textureTransformDefault("offset", [0, 0])), (value) => setPath(material, [...transformPath, "offset"], vector(value)));
            this.pointer(`/materials/${materialIndex}/${texturePath}/extensions/KHR_texture_transform/scale`, "float2", () => getDefaulted(material, [...transformPath, "scale"], textureTransformDefault("scale", [1, 1])), (value) => setPath(material, [...transformPath, "scale"], vector(value)));
            this.scalarPointer(`/materials/${materialIndex}/${texturePath}/extensions/KHR_texture_transform/rotation`, "float", () => getDefaulted(material, [...transformPath, "rotation"], textureTransformDefault("rotation", 0)), (value) => setPath(material, [...transformPath, "rotation"], value));
        }
    }

    private registerCameraPointers(): void {
        this.objectModel.cameras.forEach((camera, cameraIndex) => {
            if (camera.perspective) {
                for (const propertyName of ["aspectRatio", "yfov", "zfar", "znear"]) {
                    if (camera.perspective[propertyName] !== undefined) {
                        this.scalarPointer(`/cameras/${cameraIndex}/perspective/${propertyName}`, "float", () => camera.perspective[propertyName], (value) => camera.perspective[propertyName] = value);
                    }
                }
            }
            if (camera.orthographic) {
                for (const propertyName of ["xmag", "ymag", "zfar", "znear"]) {
                    if (camera.orthographic[propertyName] !== undefined) {
                        this.scalarPointer(`/cameras/${cameraIndex}/orthographic/${propertyName}`, "float", () => camera.orthographic[propertyName], (value) => camera.orthographic[propertyName] = value);
                    }
                }
            }
        });
    }

    private registerSkinPointers(): void {
        this.objectModel.skins.forEach((skin, skinIndex) => {
            const joints = skin.joints ?? [];
            this.scalarPointer(`/skins/${skinIndex}/joints.length`, "int", () => joints.length, ignoreSet, true);
            joints.forEach((jointIndex: number, index: number) => {
                this.pointer(`/skins/${skinIndex}/joints/${index}`, "ref", () => [ref("nodes", jointIndex)], ignoreSet, true);
            });
            if (skin.skeleton !== undefined) {
                this.pointer(`/skins/${skinIndex}/skeleton`, "ref", () => [ref("nodes", skin.skeleton)], ignoreSet, true);
            }
        });
    }

    private registerLightPointers(): void {
        this.scalarPointer("/extensions/KHR_lights_punctual/lights.length", "int", () => this.objectModel.lights.length, ignoreSet, true);
        this.objectModel.lights.forEach((light, lightIndex) => {
            this.pointer(`/extensions/KHR_lights_punctual/lights/${lightIndex}/color`, "float3", () => getDefaulted(light, ["color"], defaultFor("light.schema.json", "color", [1, 1, 1])), (value) => setPath(light, ["color"], vector(value)));
            this.scalarPointer(`/extensions/KHR_lights_punctual/lights/${lightIndex}/intensity`, "float", () => getDefaulted(light, ["intensity"], defaultFor("light.schema.json", "intensity", 1)), (value) => setPath(light, ["intensity"], value));
            this.scalarPointer(`/extensions/KHR_lights_punctual/lights/${lightIndex}/range`, "float", () => light.range ?? Infinity, (value) => light.range = value);
            if (light.type === "spot" || light.spot !== undefined) {
                light.spot = light.spot ?? {};
                this.scalarPointer(`/extensions/KHR_lights_punctual/lights/${lightIndex}/spot/innerConeAngle`, "float", () => getDefaulted(light, ["spot", "innerConeAngle"], defaultFor("light.spot.schema.json", "innerConeAngle", 0)), (value) => setPath(light, ["spot", "innerConeAngle"], value));
                this.scalarPointer(`/extensions/KHR_lights_punctual/lights/${lightIndex}/spot/outerConeAngle`, "float", () => getDefaulted(light, ["spot", "outerConeAngle"], defaultFor("light.spot.schema.json", "outerConeAngle", Math.PI / 4)), (value) => setPath(light, ["spot", "outerConeAngle"], value));
            }
        });
    }

    private registerAnimationPointers(): void {
        this.objectModel.animations.forEach((animation, animationIndex) => {
            this.scalarPointer(`/animations/${animationIndex}/extensions/KHR_interactivity/playhead`, "float", () => animation.playhead, ignoreSet, true);
            this.scalarPointer(`/animations/${animationIndex}/extensions/KHR_interactivity/virtualPlayhead`, "float", () => animation.virtualPlayhead, (value) => animation.virtualPlayhead = value);
            this.scalarPointer(`/animations/${animationIndex}/extensions/KHR_interactivity/minTime`, "float", () => animation.minTime, ignoreSet, true);
            this.scalarPointer(`/animations/${animationIndex}/extensions/KHR_interactivity/maxTime`, "float", () => animation.maxTime, ignoreSet, true);
            this.scalarPointer(`/animations/${animationIndex}/extensions/KHR_interactivity/isPlaying`, "bool", () => animation.isPlaying, ignoreSet, true);
        });
    }

    private registerInteractivityEventPointers(): void {
        const interactivity = this.objectModel.extensions?.KHR_interactivity;
        const graph = interactivity?.graphs?.[interactivity.graph ?? 0];
        const eventCountWithLifecycleEvents = (graph?.events?.length ?? 0) + 2;
        for (let eventIndex = 0; eventIndex < eventCountWithLifecycleEvents; eventIndex++) {
            const path = `/extensions/KHR_interactivity/events/${eventIndex}`;
            this.pointer(path, "ref", () => [path], ignoreSet, true);
        }
    }

    private isActiveDelayRef(path: string): boolean {
        const match = path.match(/^\/extensions\/KHR_interactivity\/delays\/(\d+)$/);
        if (!match) {
            return false;
        }
        return (this.behaveEngine as any).getScheduledDelay?.(Number(match[1])) !== undefined;
    }

    private clearActiveAnimation(animationIndex: number): void {
        const activeAnimation = this.activeAnimations.get(animationIndex);
        if (activeAnimation !== undefined) {
            clearTimeout(activeAnimation.timeout);
            this.activeAnimations.delete(animationIndex);
        }
    }

    private currentAnimationTime(animationIndex: number): number {
        const activeAnimation = this.activeAnimations.get(animationIndex);
        if (activeAnimation === undefined) {
            return this.objectModel.animations[animationIndex]?.virtualPlayhead ?? 0;
        }
        const elapsedSeconds = Math.max(0, (performance.now() - activeAnimation.startedAt) / 1000);
        const direction = activeAnimation.startTime <= activeAnimation.endTime ? 1 : -1;
        return activeAnimation.startTime + direction * elapsedSeconds * activeAnimation.speed;
    }

    private updateActiveAnimations(): void {
        for (const animationIndex of this.activeAnimations.keys()) {
            const animation = this.objectModel.animations[animationIndex];
            if (animation === undefined) {
                continue;
            }
            const requestedTime = this.currentAnimationTime(animationIndex);
            animation.virtualPlayhead = requestedTime;
            animation.playhead = effectiveAnimationTime(animation, requestedTime);
            this.applyAnimation(animationIndex, requestedTime);
        }
    }

    private applyAnimation(animationIndex: number, requestedTime: number): void {
        const animation = this.objectModel.animations[animationIndex];
        if (animation === undefined) {
            return;
        }
        const time = effectiveAnimationTime(animation, requestedTime);
        for (const channel of animation.runtimeChannels ?? []) {
            const node = this.objectModel.nodes[channel.targetNode];
            if (node === undefined) {
                continue;
            }
            const value = sampleAnimationChannel(channel, time);
            if (channel.targetPath === "translation" || channel.targetPath === "scale" || channel.targetPath === "rotation") {
                node[channel.targetPath] = value;
            } else if (channel.targetPath === "weights") {
                node.weights = value;
            }
        }
    }

    private localMatrix(nodeIndex: number): number[] {
        const node = this.objectModel.nodes[nodeIndex];
        if (node.matrix) {
            return matrixWithTranslation(node.matrix, node.translation);
        }
        return composeTrsMatrix(node.translation, node.rotation, node.scale);
    }

    private globalMatrix(nodeIndex: number): number[] {
        const parentIndex = this.objectModel.parents[nodeIndex];
        const local = this.localMatrix(nodeIndex);
        if (parentIndex === undefined) {
            return local;
        }
        return multiplyMatrices(this.globalMatrix(parentIndex), local);
    }
}

export function createGlTFObjectModelFromGltf(gltf: any): GlTFObjectModel {
    const meshes = (gltf.meshes ?? []).map(createObjectModelMesh);
    const nodes = (gltf.nodes ?? []).map((node: any) => createObjectModelNode(node, meshes));
    return completeGlTFObjectModel({
        nodes,
        parents: buildParentMap(nodes),
        materials: (gltf.materials ?? []).map(cloneValue),
        meshes,
        cameras: (gltf.cameras ?? []).map(cloneValue),
        skins: (gltf.skins ?? []).map(cloneValue),
        scenes: (gltf.scenes ?? []).map((scene: any) => ({ ...cloneValue(scene), nodes: scene.nodes ?? [] })),
        animations: (gltf.animations ?? []).map((animation: any) => createObjectModelAnimation(animation, gltf)),
        lights: (gltf.extensions?.KHR_lights_punctual?.lights ?? []).map(cloneValue),
        scene: gltf.scene ?? 0,
        extensions: cloneValue(gltf.extensions ?? {}),
    });
}

export function readGlbJsonFromArrayBuffer(buffer: ArrayBuffer): any {
    const view = new DataView(buffer);
    if (view.getUint32(0, true) !== 0x46546c67) {
        throw new Error("File is not a GLB file");
    }

    let offset = 12;
    let json: any | undefined;
    const buffers: ArrayBuffer[] = [];
    while (offset < view.byteLength) {
        const chunkLength = view.getUint32(offset, true);
        const chunkType = view.getUint32(offset + 4, true);
        if (chunkType === 0x4e4f534a) {
            const jsonBytes = new Uint8Array(buffer, offset + 8, chunkLength);
            json = JSON.parse(new TextDecoder().decode(jsonBytes).trim());
        } else if (chunkType === 0x004e4942) {
            const chunk = buffer.slice(offset + 8, offset + 8 + chunkLength);
            buffers.push(chunk);
        }
        offset += 8 + chunkLength;
    }

    if (json === undefined) {
        throw new Error("GLB file does not contain a JSON chunk");
    }

    Object.defineProperty(json, "__glbBuffers", {
        value: buffers,
        enumerable: false,
    });
    return json;
}

function completeGlTFObjectModel(objectModel: Partial<GlTFObjectModel> | any): GlTFObjectModel {
    const meshes = (objectModel.meshes ?? []).map(createObjectModelMesh);
    const nodes = (objectModel.nodes ?? []).map((node: any) => createObjectModelNode(node, meshes));
    return {
        nodes,
        parents: objectModel.parents ?? buildParentMap(nodes),
        materials: (objectModel.materials ?? []).map(cloneValue),
        meshes,
        cameras: (objectModel.cameras ?? []).map(cloneValue),
        skins: (objectModel.skins ?? []).map(cloneValue),
        scenes: (objectModel.scenes ?? []).map((scene: any) => ({ ...cloneValue(scene), nodes: scene.nodes ?? [] })),
        animations: (objectModel.animations ?? []).map((animation: any) => createObjectModelAnimation(animation, objectModel)),
        lights: (objectModel.lights ?? objectModel.extensions?.KHR_lights_punctual?.lights ?? []).map(cloneValue),
        scene: objectModel.scene ?? 0,
        extensions: cloneValue(objectModel.extensions ?? {}),
    };
}

function createObjectModelNode(node: any, meshes: any[]): any {
    const mesh = node.mesh === undefined ? undefined : meshes[node.mesh];
    return {
        ...cloneValue(node),
        translation: node.translation ?? matrixTranslation(node.matrix) ?? defaultFor("node.schema.json", "translation", [0, 0, 0]),
        scale: node.matrix === undefined ? (node.scale ?? defaultFor("node.schema.json", "scale", [1, 1, 1])) : node.scale,
        rotation: node.matrix === undefined ? (node.rotation ?? defaultFor("node.schema.json", "rotation", [0, 0, 0, 1])) : node.rotation,
        children: node.children ?? [],
        weights: createNodeWeights(node, mesh),
    };
}

function createObjectModelMesh(mesh: any): any {
    const targetCount = getMeshMorphTargetCount(mesh);
    return {
        ...cloneValue(mesh),
        primitives: mesh.primitives ?? [],
        weights: createMeshWeights(mesh, targetCount),
    };
}

function createObjectModelAnimation(animation: any, gltf: any): any {
    if (animation.runtimeChannels !== undefined) {
        return {
            ...cloneValue(animation),
            runtimeChannels: cloneValue(animation.runtimeChannels),
            playhead: animation.playhead ?? 0,
            virtualPlayhead: animation.virtualPlayhead ?? 0,
            minTime: animation.minTime,
            maxTime: animation.maxTime,
            isPlaying: animation.isPlaying ?? false,
        };
    }
    const runtimeChannels = createRuntimeAnimationChannels(animation, gltf);
    const inputTimes = runtimeChannels.flatMap((channel) => channel.input);
    const minTime = inputTimes.length > 0 ? Math.min(...inputTimes) : NaN;
    const maxTime = inputTimes.length > 0 ? Math.max(...inputTimes) : NaN;
    return {
        ...cloneValue(animation),
        runtimeChannels,
        playhead: 0,
        virtualPlayhead: 0,
        minTime,
        maxTime,
        isPlaying: false,
    };
}

function createRuntimeAnimationChannels(animation: any, gltf: any): RuntimeAnimationChannel[] {
    return (animation.channels ?? []).flatMap((channel: any) => {
        const sampler = animation.samplers?.[channel.sampler];
        const target = channel.target;
        if (sampler === undefined || target?.node === undefined || target?.path === undefined) {
            return [];
        }
        const input = readAccessorComponents(gltf, sampler.input).map((value) => Number(value[0]));
        const output = readAccessorComponents(gltf, sampler.output);
        if (input.length === 0 || output.length === 0) {
            return [];
        }
        return [{
            targetNode: target.node,
            targetPath: target.path,
            interpolation: sampler.interpolation ?? "LINEAR",
            input,
            output,
        }];
    });
}

function effectiveAnimationTime(animation: any, requestedTime: number): number {
    const maxTime = Number(animation.maxTime);
    if (!Number.isFinite(maxTime) || maxTime === 0) {
        return 0;
    }
    const iteration = requestedTime > 0 ? Math.ceil((requestedTime - maxTime) / maxTime) : Math.floor(requestedTime / maxTime);
    return requestedTime - iteration * maxTime;
}

function sampleAnimationChannel(channel: RuntimeAnimationChannel, time: number): number[] {
    const times = channel.input;
    if (times.length === 0) {
        return [];
    }
    if (time <= times[0]) {
        return animationOutputValue(channel, 0);
    }
    const lastIndex = times.length - 1;
    if (time >= times[lastIndex]) {
        return animationOutputValue(channel, lastIndex);
    }

    const nextIndex = times.findIndex((nextTime) => nextTime > time);
    const previousIndex = Math.max(0, nextIndex - 1);
    if (channel.interpolation === "STEP") {
        return animationOutputValue(channel, previousIndex);
    }

    const t0 = times[previousIndex];
    const t1 = times[nextIndex];
    const ratio = (time - t0) / (t1 - t0);
    if (channel.interpolation === "CUBICSPLINE") {
        return cubicSplineAnimationValue(channel, previousIndex, nextIndex, ratio, t1 - t0);
    }
    if (channel.targetPath === "rotation") {
        return normalizeQuaternion(slerp(animationOutputValue(channel, previousIndex), animationOutputValue(channel, nextIndex), ratio));
    }
    return interpolateArray(animationOutputValue(channel, previousIndex), animationOutputValue(channel, nextIndex), ratio);
}

function animationOutputValue(channel: RuntimeAnimationChannel, keyframeIndex: number): number[] {
    if (channel.interpolation === "CUBICSPLINE") {
        return [...channel.output[keyframeIndex * 3 + 1]];
    }
    return [...channel.output[keyframeIndex]];
}

function cubicSplineAnimationValue(channel: RuntimeAnimationChannel, previousIndex: number, nextIndex: number, ratio: number, duration: number): number[] {
    const previousValue = channel.output[previousIndex * 3 + 1];
    const previousOutTangent = channel.output[previousIndex * 3 + 2];
    const nextInTangent = channel.output[nextIndex * 3];
    const nextValue = channel.output[nextIndex * 3 + 1];
    const t2 = ratio * ratio;
    const t3 = t2 * ratio;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + ratio;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    const value = previousValue.map((_component, index) => (
        h00 * previousValue[index]
        + h10 * duration * previousOutTangent[index]
        + h01 * nextValue[index]
        + h11 * duration * nextInTangent[index]
    ));
    return channel.targetPath === "rotation" ? normalizeQuaternion(value) : value;
}

function interpolateArray(a: number[], b: number[], ratio: number): number[] {
    return a.map((value, index) => value + (b[index] - value) * ratio);
}

function slerp(a: number[], b: number[], ratio: number): number[] {
    let bx = b[0];
    let by = b[1];
    let bz = b[2];
    let bw = b[3];
    let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
    if (cos < 0) {
        cos = -cos;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
    }
    if (cos > 0.9995) {
        return interpolateArray(a, [bx, by, bz, bw], ratio);
    }
    const theta = Math.acos(Math.min(1, Math.max(-1, cos)));
    const sinTheta = Math.sin(theta);
    const scaleA = Math.sin((1 - ratio) * theta) / sinTheta;
    const scaleB = Math.sin(ratio * theta) / sinTheta;
    return [
        a[0] * scaleA + bx * scaleB,
        a[1] * scaleA + by * scaleB,
        a[2] * scaleA + bz * scaleB,
        a[3] * scaleA + bw * scaleB,
    ];
}

function normalizeQuaternion(value: number[]): number[] {
    const length = Math.hypot(value[0], value[1], value[2], value[3]);
    if (length === 0 || !Number.isFinite(length)) {
        return [0, 0, 0, 1];
    }
    return value.map((component) => component / length);
}

function readAccessorComponents(gltf: any, accessorIndex: number): number[][] {
    const accessor = gltf.accessors?.[accessorIndex];
    const bufferView = gltf.bufferViews?.[accessor?.bufferView];
    const buffers = gltf.__glbBuffers as ArrayBuffer[] | undefined;
    const buffer = buffers?.[bufferView?.buffer ?? 0];
    if (accessor === undefined || bufferView === undefined || buffer === undefined) {
        return [];
    }

    const componentCount = accessorComponentCount(accessor.type);
    const componentByteLength = accessorComponentByteLength(accessor.componentType);
    const byteStride = bufferView.byteStride ?? componentCount * componentByteLength;
    const accessorByteOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const view = new DataView(buffer);
    const values: number[][] = [];

    for (let elementIndex = 0; elementIndex < accessor.count; elementIndex++) {
        const elementOffset = accessorByteOffset + elementIndex * byteStride;
        const element: number[] = [];
        for (let componentIndex = 0; componentIndex < componentCount; componentIndex++) {
            const componentOffset = elementOffset + componentIndex * componentByteLength;
            element.push(readAccessorComponent(view, componentOffset, accessor.componentType, accessor.normalized === true));
        }
        values.push(element);
    }

    applySparseAccessorValues(values, gltf, accessor);
    return values;
}

function applySparseAccessorValues(values: number[][], gltf: any, accessor: any): void {
    const sparse = accessor.sparse;
    if (sparse === undefined || sparse.count === 0) {
        return;
    }
    const indices = readSparseIndices(gltf, sparse);
    const sparseValues = readSparseValues(gltf, sparse, accessor);
    indices.forEach((targetIndex, sparseIndex) => {
        values[targetIndex] = sparseValues[sparseIndex];
    });
}

function readSparseIndices(gltf: any, sparse: any): number[] {
    const bufferView = gltf.bufferViews?.[sparse.indices.bufferView];
    const buffer = (gltf.__glbBuffers as ArrayBuffer[] | undefined)?.[bufferView?.buffer ?? 0];
    if (bufferView === undefined || buffer === undefined) {
        return [];
    }
    const componentByteLength = accessorComponentByteLength(sparse.indices.componentType);
    const byteOffset = (bufferView.byteOffset ?? 0) + (sparse.indices.byteOffset ?? 0);
    const view = new DataView(buffer);
    return new Array(sparse.count).fill(0).map((_value, index) => readAccessorComponent(view, byteOffset + index * componentByteLength, sparse.indices.componentType, false));
}

function readSparseValues(gltf: any, sparse: any, accessor: any): number[][] {
    const bufferView = gltf.bufferViews?.[sparse.values.bufferView];
    const buffer = (gltf.__glbBuffers as ArrayBuffer[] | undefined)?.[bufferView?.buffer ?? 0];
    if (bufferView === undefined || buffer === undefined) {
        return [];
    }
    const componentCount = accessorComponentCount(accessor.type);
    const componentByteLength = accessorComponentByteLength(accessor.componentType);
    const byteStride = bufferView.byteStride ?? componentCount * componentByteLength;
    const byteOffset = (bufferView.byteOffset ?? 0) + (sparse.values.byteOffset ?? 0);
    const view = new DataView(buffer);
    return new Array(sparse.count).fill(0).map((_value, elementIndex) => (
        new Array(componentCount).fill(0).map((_component, componentIndex) => (
            readAccessorComponent(view, byteOffset + elementIndex * byteStride + componentIndex * componentByteLength, accessor.componentType, accessor.normalized === true)
        ))
    ));
}

function accessorComponentCount(type: string): number {
    switch (type) {
        case "SCALAR": return 1;
        case "VEC2": return 2;
        case "VEC3": return 3;
        case "VEC4": return 4;
        case "MAT2": return 4;
        case "MAT3": return 9;
        case "MAT4": return 16;
        default: return 0;
    }
}

function accessorComponentByteLength(componentType: number): number {
    switch (componentType) {
        case 5120:
        case 5121:
            return 1;
        case 5122:
        case 5123:
            return 2;
        case 5125:
        case 5126:
            return 4;
        default:
            return 0;
    }
}

function readAccessorComponent(view: DataView, byteOffset: number, componentType: number, normalized: boolean): number {
    switch (componentType) {
        case 5120: {
            const value = view.getInt8(byteOffset);
            return normalized ? Math.max(value / 127, -1) : value;
        }
        case 5121: {
            const value = view.getUint8(byteOffset);
            return normalized ? value / 255 : value;
        }
        case 5122: {
            const value = view.getInt16(byteOffset, true);
            return normalized ? Math.max(value / 32767, -1) : value;
        }
        case 5123: {
            const value = view.getUint16(byteOffset, true);
            return normalized ? value / 65535 : value;
        }
        case 5125:
            return view.getUint32(byteOffset, true);
        case 5126:
            return view.getFloat32(byteOffset, true);
        default:
            return NaN;
    }
}

function createNodeWeights(node: any, mesh: any | undefined): number[] {
    if (mesh === undefined || mesh.weights.length === 0) {
        return [];
    }
    return cloneValue(node.weights ?? mesh.weights);
}

function createMeshWeights(mesh: any, targetCount: number): number[] {
    if (targetCount === 0) {
        return [];
    }
    return cloneValue(mesh.weights ?? new Array(targetCount).fill(0));
}

function getMeshMorphTargetCount(mesh: any): number {
    return Math.max(0, ...(mesh.primitives ?? []).map((primitive: any) => primitive.targets?.length ?? 0));
}

function defaultFor(schemaName: string, propertyName: string, fallback: any): any {
    const match = Object.entries(SCHEMA_DEFAULTS).find(([schemaPointer]) => schemaPointer.endsWith(`/${schemaName}#/properties/${propertyName}`));
    return cloneValue(match?.[1] ?? fallback);
}

function textureTransformDefault(propertyName: string, fallback: any): any {
    return schemaDefault(`${KHR}/KHR_texture_transform/schema/KHR_texture_transform.textureInfo.schema.json`, propertyName, fallback);
}

function textureInfoPaths(material: any): string[] {
    const paths = ["normalTexture", "occlusionTexture", "emissiveTexture"];
    if (material.pbrMetallicRoughness !== undefined) {
        paths.push("pbrMetallicRoughness/baseColorTexture", "pbrMetallicRoughness/metallicRoughnessTexture");
    }
    for (const extensionName of Object.keys(material.extensions ?? {})) {
        collectTextureInfoPaths(material.extensions[extensionName], `extensions/${extensionName}`, paths);
    }
    return paths;
}

function collectTextureInfoPaths(value: any, prefix: string, paths: string[]): void {
    if (value === undefined || typeof value !== "object" || Array.isArray(value)) {
        return;
    }
    for (const [key, child] of Object.entries(value)) {
        const childPath = `${prefix}/${key}`;
        if (key.endsWith("Texture") && child !== undefined && typeof child === "object") {
            paths.push(childPath);
        }
        collectTextureInfoPaths(child, childPath, paths);
    }
}

function getDefaulted(target: any, pathParts: string[], defaultValue: any): any {
    const value = getPath(target, pathParts);
    return cloneValue(value === undefined ? defaultValue : value);
}

function getPath(target: any, pathParts: string[]): any {
    return pathParts.reduce((current, key) => current?.[key], target);
}

function setPath(target: any, pathParts: string[], value: any): void {
    let current = target;
    pathParts.slice(0, -1).forEach((key) => {
        current[key] = current[key] ?? {};
        current = current[key];
    });
    current[pathParts[pathParts.length - 1]] = cloneValue(value);
}

function ref(collectionPath: string, index: number): string {
    return `/${collectionPath}/${index}/`;
}

function withoutTrailingSlash(path: string): string {
    return path.endsWith("/") ? path.slice(0, -1) : path;
}

function scalar(value: any): any {
    return Array.isArray(value) ? value[0] : value;
}

function vector(value: any): any[] {
    return Array.isArray(value) ? cloneValue(value) : [value];
}

function isScalarType(typeName: string): boolean {
    return typeName === "bool" || typeName === "float" || typeName === "int";
}

function cloneValue<T>(value: T): T {
    if (value === undefined) {
        return value;
    }
    if (value === null || typeof value !== "object") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(cloneValue) as T;
    }
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneValue(child)])) as T;
}

function ignoreSet(_value: any): void {
    return undefined;
}

function matrixTranslation(matrix: number[] | undefined): number[] | undefined {
    return matrix === undefined ? undefined : [matrix[12], matrix[13], matrix[14]];
}

function matrixWithTranslation(matrix: number[], translation: number[]): number[] {
    const result = [...matrix];
    result[12] = translation[0];
    result[13] = translation[1];
    result[14] = translation[2];
    return result;
}

function composeTrsMatrix(translation: number[], rotation: number[], scale: number[]): number[] {
    const [x, y, z, w] = rotation;
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    const sx = scale[0];
    const sy = scale[1];
    const sz = scale[2];

    return [
        (1 - (yy + zz)) * sx,
        (xy + wz) * sx,
        (xz - wy) * sx,
        0,
        (xy - wz) * sy,
        (1 - (xx + zz)) * sy,
        (yz + wx) * sy,
        0,
        (xz + wy) * sz,
        (yz - wx) * sz,
        (1 - (xx + yy)) * sz,
        0,
        translation[0],
        translation[1],
        translation[2],
        1,
    ];
}

function multiplyMatrices(a: number[], b: number[]): number[] {
    const out = new Array(16).fill(0);
    for (let row = 0; row < 4; row++) {
        for (let column = 0; column < 4; column++) {
            out[column * 4 + row] =
                a[0 * 4 + row] * b[column * 4 + 0]
                + a[1 * 4 + row] * b[column * 4 + 1]
                + a[2 * 4 + row] * b[column * 4 + 2]
                + a[3 * 4 + row] * b[column * 4 + 3];
        }
    }
    return out;
}

function buildParentMap(nodes: any[]): Record<number, number> {
    const parents: Record<number, number> = {};
    nodes.forEach((node, parentIndex) => {
        for (const childIndex of node.children ?? []) {
            parents[childIndex] = parentIndex;
        }
    });
    return parents;
}
