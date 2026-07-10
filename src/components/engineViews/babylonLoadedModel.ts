import { AbstractMesh, AnimationGroup, AssetContainer, Material, Node, TransformNode } from "@babylonjs/core";

export interface BabylonLoadedModel {
    nodes: Node[];
    animations: AnimationGroup[];
    materials: Material[];
    meshes: AbstractMesh[];
}

export interface BabylonDecoratorWorld {
    glTFNodes: Node[];
    animations: AnimationGroup[];
    materials: Material[];
    meshes: AbstractMesh[];
}

export function buildBabylonLoadedModel(container: AssetContainer): BabylonLoadedModel {
    return {
        nodes: buildGlTFNodeLayout(container.rootNodes[0]),
        animations: container.animationGroups,
        materials: sortGltfMaterials(container.materials),
        meshes: container.meshes,
    };
}

export function buildBabylonDecoratorWorld(model: BabylonLoadedModel): BabylonDecoratorWorld {
    return {
        glTFNodes: model.nodes,
        animations: model.animations,
        materials: model.materials,
        meshes: model.meshes.filter((mesh) => mesh.subMeshes !== undefined),
    };
}

function buildGlTFNodeLayout(rootNode: Node): Node[] {
    const pattern = /^\/nodes\/\d+$/;
    const finalNodes: TransformNode[] = [];
    const seenNodeIndices = new Set<number>();

    function traverse(node: TransformNode): void {
        node.metadata = node.metadata ?? {};
        node.metadata.nodePointer = node._internalMetadata?.gltf?.pointers?.find((pointer: string) => pattern.test(pointer));
        if (node.metadata.nodePointer != null) {
            const nodeIndex = Number(node.metadata.nodePointer.split("/")[2]);
            if (!seenNodeIndices.has(nodeIndex)) {
                seenNodeIndices.add(nodeIndex);
                node.metadata.nodeIndex = nodeIndex;
                finalNodes.push(node);
            }
        }

        for (const childNode of node.getChildTransformNodes()) {
            traverse(childNode);
        }
    }

    rootNode.getChildren<TransformNode>().forEach((child) => traverse(child));
    finalNodes.sort((a, b) => a.metadata.nodeIndex - b.metadata.nodeIndex);
    return finalNodes;
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
