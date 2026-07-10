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
    startAnimation = (_animationIndex: number, _startTime: number, _endTime: number, _speed: number, callback: () => void): void => callback();
    stopAnimation = (_animationIndex: number): void => undefined;
    stopAnimationAt = (_animationIndex: number, _stopTime: number, callback: () => void): void => callback();
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
    };

    private bridgeObjectModelHooks(): void {
        this.behaveEngine.isValidJsonPtr = this.isValidJsonPtr;
        this.behaveEngine.isReadOnly = this.isReadOnly;
        this.behaveEngine.getPathValue = this.getPathValue;
        this.behaveEngine.getPathtypeName = this.getPathtypeName;
        this.behaveEngine.setPathValue = this.setPathValue;
        this.behaveEngine.getRegisteredJsonPointers = this.getRegisteredJsonPointers;
    }

    isValidJsonPtr = (path: string): boolean => this.pointerBindings.has(path);
    isReadOnly = (path: string): boolean => this.pointerBindings.get(path)?.readOnly ?? false;
    getPathValue = (path: string): any => this.pointerBindings.get(path)?.get();
    getPathtypeName = (path: string): string | undefined => this.pointerBindings.get(path)?.typeName;
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
        animations: (gltf.animations ?? []).map(createObjectModelAnimation),
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
    while (offset < view.byteLength) {
        const chunkLength = view.getUint32(offset, true);
        const chunkType = view.getUint32(offset + 4, true);
        if (chunkType === 0x4e4f534a) {
            const jsonBytes = new Uint8Array(buffer, offset + 8, chunkLength);
            return JSON.parse(new TextDecoder().decode(jsonBytes).trim());
        }
        offset += 8 + chunkLength;
    }

    throw new Error("GLB file does not contain a JSON chunk");
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
        animations: (objectModel.animations ?? []).map(createObjectModelAnimation),
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

function createObjectModelAnimation(animation: any): any {
    return {
        ...cloneValue(animation),
        playhead: 0,
        virtualPlayhead: 0,
        minTime: 0,
        maxTime: animation.maxTime ?? animation.samplers?.length ?? 0,
        isPlaying: false,
    };
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
