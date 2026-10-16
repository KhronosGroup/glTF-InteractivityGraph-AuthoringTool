import { AbstractMesh, AnimationGroup, AssetContainer, Camera, Material, Matrix, Node, Scene, TransformNode } from "@babylonjs/core";
import { BabylonAssetModel, getBabylonAssetModel } from "./babylonAssetModel";
import type { IGLTF } from "@babylonjs/loaders/glTF/2.0/glTFLoaderInterfaces";
import { GLTFFileLoader } from "@babylonjs/loaders";

export interface BabylonLoadedModel {
    nodes: (Node | undefined)[];
    assetModel?: BabylonAssetModel;
    animations: AnimationGroup[];
    materials: Material[];
    meshes: AbstractMesh[];
}

export interface BabylonDecoratorWorld {
    glTFNodes: (Node | undefined)[];
    assetModel?: BabylonAssetModel;
    animations: AnimationGroup[];
    materials: Material[];
    meshes: AbstractMesh[];
}

// For a skinned glTF node, Babylon parents the actual mesh as a sibling of the skeleton root rather
// than as a child of the node's own placeholder TransformNode (see GLTFLoader's "second
// implementation note" handling), so `node.getChildMeshes()` can never find it. The loader's
// onSkinLoaded observable is the only place that still links the two, so stash the skinned mesh on
// the placeholder's metadata while loading so BabylonDecorator can recover the node -> skin
// relationship for the `/nodes/{n}/skin` pointer.
export function attachSkinLoadedMetadata(loader: GLTFFileLoader): void {
    loader.onSkinLoaded = (node, skinnedNode) => {
        node.metadata = node.metadata || {};
        node.metadata.skinnedMesh = skinnedNode;
    };
}

export function buildBabylonLoadedModel(container: AssetContainer): BabylonLoadedModel {
    return {
        nodes: buildGlTFNodeLayout(container),
        assetModel: getBabylonAssetModel(container.rootNodes[0] as TransformNode),
        animations: container.animationGroups,
        materials: sortGltfMaterials(container.materials),
        meshes: container.meshes,
    };
}

export function buildBabylonDecoratorWorld(model: BabylonLoadedModel): BabylonDecoratorWorld {
    return {
        glTFNodes: model.nodes,
        assetModel: model.assetModel,
        animations: model.animations,
        materials: model.materials,
        meshes: model.meshes.filter((mesh) => mesh.subMeshes !== undefined),
    };
}

function buildGlTFNodeLayout(container: AssetContainer): (Node | undefined)[] {
    const model = getBabylonAssetModel(container.rootNodes[0] as TransformNode);
    const nodes: (Node | undefined)[] = new Array(model?.nodes.length ?? 0);
    for (const node of [...container.transformNodes, ...container.meshes]) {
        const pointer = node._internalMetadata?.gltf?.pointers?.find((pointer: string) => /^\/nodes\/\d+$/.test(pointer));
        if (pointer === undefined) continue;
        const index = Number(pointer.split("/")[2]);
        node.metadata = { ...node.metadata, nodeIndex: index, nodePointer: pointer };
        // The transform owns the glTF local TRS when skinned geometry is reparented by Babylon.
        if (nodes[index] !== undefined && node.metadata.skinnedMesh === undefined) continue;
        nodes[index] = node;
    }
    nodes.forEach((node, index) => { if (node instanceof TransformNode) model?.bindNode(index, node, nodes); });
    if (model) model.nativeCameras.splice(0, model.nativeCameras.length, ...container.cameras);
    return nodes;
}

function sortGltfMaterials(materials: Material[]): Material[] {
    return materials
        .filter((mat) => mat._internalMetadata?.gltf?.pointers !== undefined)
        .sort(compareGltfPointerIndex);
}

function compareGltfPointerIndex(a: Material, b: Material): number {
    const aPointer = a._internalMetadata?.gltf?.pointers?.[0] ?? "";
    const bPointer = b._internalMetadata?.gltf?.pointers?.[0] ?? "";
    return Number(aPointer.split("/")[2]) - Number(bPointer.split("/")[2]);
}

/** Adapt callers that construct a Babylon world directly, without the glTF loader. */
export function createBabylonRuntimeAssetModel(nodes: readonly (TransformNode | undefined)[], scene: Scene): BabylonAssetModel {
    const pointerIndex = (node: Node | undefined, pattern: RegExp): number | undefined => {
        const pointer = node?._internalMetadata?.gltf?.pointers?.find((value: string) => pattern.test(value));
        return pointer === undefined ? undefined : Number(pointer.split("/")[2]);
    };
    const definitions: NonNullable<IGLTF["nodes"]> = new Array(nodes.length);
    nodes.forEach((node, index) => {
        if (!node) return;
        const owner: TransformNode = node.metadata?.skinnedMesh ?? node;
        const meshes = [owner, ...owner.getChildMeshes(true)].filter(mesh => !nodes.includes(mesh));
        if (owner instanceof AbstractMesh) meshes.unshift(owner);
        const skeleton = owner instanceof AbstractMesh ? owner.skeleton?.id.match(/^skeleton(\d+)$/) : undefined;
        definitions[index] = {
            index,
            children: node.getChildren().map(child => nodes.indexOf(child as TransformNode)).filter(index => index !== -1),
            mesh: meshes.map(mesh => pointerIndex(mesh, /^\/meshes\/\d+\/primitives\/\d+$/)).find(index => index !== undefined),
            camera: pointerIndex(node.getChildren().find(child => child instanceof Camera), /^\/cameras\/\d+$/),
            skin: skeleton ? Number(skeleton[1]) : undefined,
            extensions: {
                KHR_node_visibility: { visible: owner instanceof AbstractMesh ? owner.isVisible : true },
                KHR_node_selectability: { selectable: node.metadata?.selectable ?? true },
                KHR_node_hoverability: { hoverable: node.metadata?.hoverable ?? true },
            },
        };
    });
    const model = new BabylonAssetModel({
        asset: { version: "2.0" },
        nodes: definitions.map((definition, index) => scene.metadata?.gltfStructure?.nodes[index] ?? definition),
    });
    nodes.forEach((node, index) => {
        if (!node) return;
        model.bindNode(index, node, nodes);
        const logical = model.nodes[index];
        logical.weights = Array.from({ length: logical.morphManagers[0]?.numTargets ?? 0 }, (_, slot) => logical.morphManagers[0].getTarget(slot).influence);
    });
    // Direct Babylon worlds can have host transforms outside the glTF node list.
    model.globalMatrix = index => {
        const native = nodes[index]!;
        const matrix = native.computeWorldMatrix(true).clone();
        return scene.useRightHandedSystem ? matrix : matrix.multiply(Matrix.Scaling(-1, 1, 1));
    };
    return model;
}
