import { NullEngine, PBRMaterial, Quaternion, Scene as BabylonScene, TransformNode, Mesh as BabylonMesh } from "@babylonjs/core";

export { NullEngine, BabylonScene };

export function createBabylonWorld(gltf: any, scene: BabylonScene): any {
    const materials = (gltf.materials ?? []).map((material: any, index: number) => {
        const pbr = material.pbrMetallicRoughness ?? {};
        const mat = new PBRMaterial(material.name ?? `material-${index}`, scene);
        const color = pbr.baseColorFactor ?? [1, 1, 1, 1];
        mat.albedoColor.set(color[0], color[1], color[2]);
        mat.alpha = color[3];
        mat.roughness = pbr.roughnessFactor ?? 1;
        mat.metallic = pbr.metallicFactor ?? 1;
        mat.alphaCutOff = material.alphaCutoff ?? 0;
        return mat;
    });

    const nodes = (gltf.nodes ?? []).map((node: any, index: number) => {
        const materialIndex = gltf.meshes?.[node.mesh]?.primitives?.[0]?.material;
        const transform = node.mesh !== undefined
            ? new BabylonMesh(node.name ?? `node-${index}`, scene)
            : new TransformNode(node.name ?? `node-${index}`, scene);
        transform.metadata = {
            nodeIndex: index,
            selectable: node.extensions?.KHR_node_selectability?.selectable ?? true,
            hoverable: node.extensions?.KHR_node_hoverability?.hoverable ?? true,
        };
        (transform as any)._internalMetadata = {
            gltf: {
                pointers: node.mesh !== undefined
                    ? [`/nodes/${index}`, `/meshes/${node.mesh}/primitives/0`]
                    : [`/nodes/${index}`],
            },
        };
        transform.position.fromArray(node.translation ?? [0, 0, 0]);
        transform.scaling.fromArray(node.scale ?? [1, 1, 1]);
        transform.rotationQuaternion = Quaternion.FromArray(node.rotation ?? [0, 0, 0, 1]);
        if (transform instanceof BabylonMesh && materialIndex !== undefined) {
            transform.material = materials[materialIndex];
        }
        return transform;
    });

    (gltf.nodes ?? []).forEach((node: any, index: number) => {
        for (const childIndex of node.children ?? []) {
            nodes[childIndex].parent = nodes[index];
        }
    });

    return {
        glTFNodes: nodes,
        materials,
        animations: [],
        meshes: nodes.filter((node: TransformNode) => node instanceof BabylonMesh),
    };
}
