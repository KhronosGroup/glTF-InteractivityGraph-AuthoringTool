/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { ADecorator } from "../BasicBehaveEngine/ADecorator";
import { BehaveEngineNode } from "../BasicBehaveEngine/BehaveEngineNode";
import { IBehaveEngine } from "../BasicBehaveEngine/IBehaveEngine";
import { IInteractivityFlow } from "../BasicBehaveEngine/types/InteractivityGraph";

export interface GlTFObjectModel {
    nodes: any[];
    parents: Record<number, number>;
    materials: any[];
    meshes: any[];
    animations: any[];
    lights: any[];
}

const ignoreSet = (_path: string, _value: any): void => {
    return undefined;
};

export class GlTFObjectModelDecorator extends ADecorator {
    protected objectModel: GlTFObjectModel;

    constructor(behaveEngine: IBehaveEngine, objectModel: Partial<GlTFObjectModel> = {}) {
        super(behaveEngine);
        this.objectModel = completeGlTFObjectModel(objectModel);
        this.behaveEngine.resolveRef = this.resolveRef;
        this.bridgeEngineHooks();
        this.registerKnownPointers();
    }

    processNodeStarted = (_node: BehaveEngineNode): void => {
        return undefined;
    };
    processAddingNodeToQueue = (_flow: IInteractivityFlow): void => {
        return undefined;
    };
    processExecutingNextNode = (_flow: IInteractivityFlow): void => {
        return undefined;
    };
    startAnimation = (_animationIndex: number, _startTime: number, _endTime: number, _speed: number, callback: () => void): void => callback();
    stopAnimation = (_animationIndex: number): void => {
        return undefined;
    };
    stopAnimationAt = (_animationIndex: number, _stopTime: number, callback: () => void): void => callback();
    getWorld = (): GlTFObjectModel => this.objectModel;
    getParentNodeIndex = (nodeIndex: number): number | undefined => this.objectModel.parents[nodeIndex];

    registerKnownPointers = (): void => {
        const nodeCount = this.objectModel.nodes.length;
        const materialCount = this.objectModel.materials.length;
        const meshCount = this.objectModel.meshes.length;
        const animationCount = this.objectModel.animations.length;
        const lightCount = this.objectModel.lights.length;
        const maxWeights = Math.max(1, ...this.objectModel.nodes.map((node: any) => node.weights?.length ?? 0));
        const maxChildren = Math.max(1, ...this.objectModel.nodes.map((node: any) => node.children?.length ?? 0));
        const maxPrimitiveCount = Math.max(1, ...this.objectModel.meshes.map((mesh: any) => mesh.primitives?.length ?? 0));

        this.pointer("/nodes.length", () => [nodeCount], ignoreSet, "int", true);
        this.pointer("/materials.length", () => [materialCount], ignoreSet, "int", true);
        this.pointer("/animations.length", () => [animationCount], ignoreSet, "int", true);

        this.pointer(`/nodes/${nodeCount}/translation`, (p) => this.node(p).translation, (p, v) => this.node(p).translation = v, "float3");
        this.pointer(`/nodes/${nodeCount}/scale`, (p) => this.node(p).scale, (p, v) => this.node(p).scale = v, "float3");
        this.pointer(`/nodes/${nodeCount}/rotation`, (p) => this.node(p).rotation, (p, v) => this.node(p).rotation = v, "float4");
        this.pointer(`/nodes/${nodeCount}/matrix`, (p) => this.localMatrix(this.part(p, 2)), ignoreSet, "float4x4", true);
        this.pointer(`/nodes/${nodeCount}/globalMatrix`, (p) => this.globalMatrix(this.part(p, 2)), ignoreSet, "float4x4", true);
        this.pointer(`/nodes/${nodeCount}/mesh`, (p) => this.node(p).mesh == null ? [null] : [`/meshes/${this.node(p).mesh}`], ignoreSet, "ref", true);
        this.pointer(`/nodes/${nodeCount}/children/${maxChildren}`, (p) => {
            const childIndex = this.node(p).children?.[this.part(p, 4)];
            return childIndex == null ? [null] : [`/nodes/${childIndex}`];
        }, ignoreSet, "ref", true);
        this.pointer(`/nodes/${nodeCount}/weights/${maxWeights}`, (p) => [this.node(p).weights[this.part(p, 4)] ?? 0], (p, v) => this.node(p).weights[this.part(p, 4)] = scalar(v), "float");
        this.pointer(`/nodes/${nodeCount}/extensions/KHR_node_visibility/visible`, (p) => [this.node(p).visible], (p, v) => this.node(p).visible = scalar(v), "bool");
        this.pointer(`/nodes/${nodeCount}/extensions/KHR_node_selectability/selectable`, (p) => [this.node(p).selectable], (p, v) => this.node(p).selectable = scalar(v), "bool");
        this.pointer(`/nodes/${nodeCount}/extensions/KHR_node_hoverability/hoverable`, (p) => [this.node(p).hoverable], (p, v) => this.node(p).hoverable = scalar(v), "bool");

        this.pointer(`/materials/${materialCount}/pbrMetallicRoughness/baseColorFactor`, (p) => this.material(p).baseColorFactor, (p, v) => this.material(p).baseColorFactor = v, "float4");
        this.pointer(`/materials/${materialCount}/pbrMetallicRoughness/roughnessFactor`, (p) => [this.material(p).roughnessFactor], (p, v) => this.material(p).roughnessFactor = scalar(v), "float");
        this.pointer(`/materials/${materialCount}/pbrMetallicRoughness/metallicFactor`, (p) => [this.material(p).metallicFactor], (p, v) => this.material(p).metallicFactor = scalar(v), "float");
        this.pointer(`/materials/${materialCount}/alphaCutoff`, (p) => [this.material(p).alphaCutoff], (p, v) => this.material(p).alphaCutoff = scalar(v), "float");
        this.pointer(`/materials/${materialCount}/emissiveFactor`, (p) => this.material(p).emissiveFactor, (p, v) => this.material(p).emissiveFactor = v, "float3");
        this.pointer(`/materials/${materialCount}/normalTexture/scale`, (p) => [this.material(p).normalTextureScale], (p, v) => this.material(p).normalTextureScale = scalar(v), "float");
        this.pointer(`/materials/${materialCount}/occlusionTexture/strength`, (p) => [this.material(p).occlusionTextureStrength], (p, v) => this.material(p).occlusionTextureStrength = scalar(v), "float");
        this.pointer(`/materials/${materialCount}/extensions/KHR_materials_emissive_strength/emissiveStrength`, (p) => [this.material(p).emissiveStrength], (p, v) => this.material(p).emissiveStrength = scalar(v), "float");
        this.pointer(`/materials/${materialCount}/extensions/KHR_materials_transmission/transmissionFactor`, (p) => [this.material(p).transmissionFactor], (p, v) => this.material(p).transmissionFactor = scalar(v), "float");
        for (const texturePath of ["pbrMetallicRoughness/baseColorTexture", "pbrMetallicRoughness/metallicRoughnessTexture", "normalTexture", "occlusionTexture", "emissiveTexture"]) {
            this.pointer(`/materials/${materialCount}/${texturePath}/extensions/KHR_texture_transform/offset`, (p) => this.textureTransform(p, texturePath).offset, (p, v) => this.textureTransform(p, texturePath).offset = v, "float2");
            this.pointer(`/materials/${materialCount}/${texturePath}/extensions/KHR_texture_transform/scale`, (p) => this.textureTransform(p, texturePath).scale, (p, v) => this.textureTransform(p, texturePath).scale = v, "float2");
            this.pointer(`/materials/${materialCount}/${texturePath}/extensions/KHR_texture_transform/rotation`, (p) => [this.textureTransform(p, texturePath).rotation], (p, v) => this.textureTransform(p, texturePath).rotation = scalar(v), "float");
        }

        this.pointer(`/meshes/${meshCount}/primitives/${maxPrimitiveCount}/material`, (p) => [this.mesh(p).primitives[this.part(p, 4)]?.material ?? -1], (p, v) => this.mesh(p).primitives[this.part(p, 4)].material = scalar(v), "int");

        this.pointer(`/extensions/KHR_lights_punctual/lights/${lightCount}/color`, (p) => this.light(p).color, (p, v) => this.light(p).color = v, "float3");
        this.pointer(`/extensions/KHR_lights_punctual/lights/${lightCount}/intensity`, (p) => [this.light(p).intensity], (p, v) => this.light(p).intensity = scalar(v), "float");
        this.pointer(`/extensions/KHR_lights_punctual/lights/${lightCount}/range`, (p) => [this.light(p).range], (p, v) => this.light(p).range = scalar(v), "float");
        this.pointer(`/extensions/KHR_lights_punctual/lights/${lightCount}/spot/innerConeAngle`, (p) => [this.light(p).spot.innerConeAngle], (p, v) => this.light(p).spot.innerConeAngle = scalar(v), "float");
        this.pointer(`/extensions/KHR_lights_punctual/lights/${lightCount}/spot/outerConeAngle`, (p) => [this.light(p).spot.outerConeAngle], (p, v) => this.light(p).spot.outerConeAngle = scalar(v), "float");

        this.pointer(`/animations/${animationCount}/extensions/KHR_interactivity/playhead`, () => [0], ignoreSet, "float", true);
        this.pointer(`/animations/${animationCount}/extensions/KHR_interactivity/virtualPlayhead`, () => [0], ignoreSet, "float", true);
        this.pointer(`/animations/${animationCount}/extensions/KHR_interactivity/minTime`, () => [0], ignoreSet, "float", true);
        this.pointer(`/animations/${animationCount}/extensions/KHR_interactivity/maxTime`, (p) => [this.animation(p).maxTime], ignoreSet, "float", true);
        this.pointer(`/animations/${animationCount}/extensions/KHR_interactivity/isPlaying`, () => [false], ignoreSet, "bool", true);
    };

    private pointer(path: string, getter: (path: string) => any, setter: (path: string, value: any) => void, typeName: string, readOnly = false): void {
        this.registerJsonPointer(path, getter, setter, typeName, readOnly);
    }

    private part(pathValue: string, index: number): number {
        return Number(pathValue.split("/")[index]);
    }

    private node(pathValue: string): any {
        return this.objectModel.nodes[this.part(pathValue, 2)];
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

    private material(pathValue: string): any {
        return this.objectModel.materials[this.part(pathValue, 2)];
    }

    private mesh(pathValue: string): any {
        return this.objectModel.meshes[this.part(pathValue, 2)];
    }

    private animation(pathValue: string): any {
        return this.objectModel.animations[this.part(pathValue, 2)];
    }

    private light(pathValue: string): any {
        return this.objectModel.lights[this.part(pathValue, 4)];
    }

    private textureTransform(pathValue: string, texturePath: string): any {
        const material = this.material(pathValue);
        material.textureTransforms[texturePath] = material.textureTransforms[texturePath] ?? { offset: [0, 0], scale: [1, 1], rotation: 0 };
        return material.textureTransforms[texturePath];
    }
}

export function createGlTFObjectModelFromGltf(gltf: any): GlTFObjectModel {
    return completeGlTFObjectModel({
        nodes: (gltf.nodes ?? []).map((node: any) => ({
            translation: node.translation ?? matrixTranslation(node.matrix) ?? [0, 0, 0],
            scale: node.scale ?? [1, 1, 1],
            rotation: node.rotation ?? [0, 0, 0, 1],
            matrix: node.matrix,
            mesh: node.mesh,
            children: node.children ?? [],
            weights: node.weights ?? [],
            visible: node.extensions?.KHR_node_visibility?.visible ?? true,
            selectable: node.extensions?.KHR_node_selectability?.selectable ?? true,
            hoverable: node.extensions?.KHR_node_hoverability?.hoverable ?? true,
        })),
        parents: buildParentMap(gltf.nodes ?? []),
        materials: (gltf.materials ?? []).map(createObjectModelMaterial),
        meshes: (gltf.meshes ?? []).map((mesh: any) => ({ primitives: mesh.primitives ?? [] })),
        animations: (gltf.animations ?? []).map((animation: any) => ({ maxTime: animation.samplers?.length ?? 0 })),
        lights: (gltf.extensions?.KHR_lights_punctual?.lights ?? []).map(createObjectModelLight),
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
    const nodes = (objectModel.nodes ?? []).map(createObjectModelNode);
    return {
        nodes,
        parents: objectModel.parents ?? buildParentMap(nodes),
        materials: (objectModel.materials ?? []).map(createObjectModelMaterial),
        meshes: (objectModel.meshes ?? []).map((mesh: any) => ({ primitives: mesh.primitives ?? [] })),
        animations: (objectModel.animations ?? []).map((animation: any) => ({ maxTime: animation.maxTime ?? animation.samplers?.length ?? 0 })),
        lights: (objectModel.lights ?? objectModel.extensions?.KHR_lights_punctual?.lights ?? []).map(createObjectModelLight),
    };
}

function createObjectModelNode(node: any): any {
    return {
        translation: node.translation ?? matrixTranslation(node.matrix) ?? [0, 0, 0],
        scale: node.scale ?? [1, 1, 1],
        rotation: node.rotation ?? [0, 0, 0, 1],
        matrix: node.matrix,
        mesh: node.mesh,
        children: node.children ?? [],
        weights: node.weights ?? [],
        visible: node.visible ?? node.extensions?.KHR_node_visibility?.visible ?? true,
        selectable: node.selectable ?? node.extensions?.KHR_node_selectability?.selectable ?? true,
        hoverable: node.hoverable ?? node.extensions?.KHR_node_hoverability?.hoverable ?? true,
    };
}

function createObjectModelMaterial(material: any): any {
    const pbr = material.pbrMetallicRoughness ?? {};
    return {
        baseColorFactor: material.baseColorFactor ?? pbr.baseColorFactor ?? [1, 1, 1, 1],
        roughnessFactor: material.roughnessFactor ?? pbr.roughnessFactor ?? 1,
        metallicFactor: material.metallicFactor ?? pbr.metallicFactor ?? 1,
        alphaCutoff: material.alphaCutoff ?? 0.5,
        emissiveFactor: material.emissiveFactor ?? [0, 0, 0],
        normalTextureScale: material.normalTextureScale ?? material.normalTexture?.scale ?? 1,
        occlusionTextureStrength: material.occlusionTextureStrength ?? material.occlusionTexture?.strength ?? 1,
        emissiveStrength: material.emissiveStrength ?? material.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1,
        transmissionFactor: material.transmissionFactor ?? material.extensions?.KHR_materials_transmission?.transmissionFactor ?? 0,
        textureTransforms: material.textureTransforms ?? {},
    };
}

function createObjectModelLight(light: any): any {
    return {
        color: light.color ?? [1, 1, 1],
        intensity: light.intensity ?? 1,
        range: light.range ?? 0,
        spot: {
            innerConeAngle: light.spot?.innerConeAngle ?? 0,
            outerConeAngle: light.spot?.outerConeAngle ?? Math.PI / 4,
        },
    };
}

function scalar(value: any): any {
    return Array.isArray(value) ? value[0] : value;
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
