/**
 * An engine-agnostic snapshot of the loaded glTF's addressable objects, used to power the ref-socket
 * value picker in the authoring UI. Built from the raw glTF JSON (available from the Babylon loader
 * and the three.js parser), so names, indices and the node hierarchy are all faithful.
 */

export interface GltfObjectNode {
    index: number;
    name: string;
    children: number[];
}

export interface GltfObject {
    index: number;
    name: string;
}

export interface GltfObjectModel {
    nodes: GltfObjectNode[];
    /** top-level node indices (nodes that are not a child of any other node) */
    rootNodes: number[];
    meshes: GltfObject[];
    materials: GltfObject[];
    cameras: GltfObject[];
    animations: GltfObject[];
}

/** Category metadata: how each category maps to a JSON pointer prefix and a tree/list presentation. */
export interface RefCategory {
    id: keyof Pick<GltfObjectModel, "nodes" | "meshes" | "materials" | "cameras" | "animations">;
    label: string;
    /** JSON pointer prefix, e.g. "/nodes" -> a selection yields "/nodes/3" */
    pointerPrefix: string;
    /** nodes are shown as a hierarchy, everything else as a flat list */
    tree: boolean;
}

export const REF_CATEGORIES: RefCategory[] = [
    { id: "nodes", label: "Nodes", pointerPrefix: "/nodes", tree: true },
    { id: "meshes", label: "Meshes", pointerPrefix: "/meshes", tree: false },
    { id: "materials", label: "Materials", pointerPrefix: "/materials", tree: false },
    { id: "cameras", label: "Cameras", pointerPrefix: "/cameras", tree: false },
    { id: "animations", label: "Animations", pointerPrefix: "/animations", tree: false },
];

const named = (item: any, fallbackPrefix: string, index: number): GltfObject => ({
    index,
    name: item?.name ? String(item.name) : `${fallbackPrefix} ${index}`,
});

/** Build the object model snapshot from raw glTF JSON. Safe against missing/partial arrays. */
export const buildGltfObjectModel = (gltf: any): GltfObjectModel => {
    const rawNodes: any[] = Array.isArray(gltf?.nodes) ? gltf.nodes : [];

    const nodes: GltfObjectNode[] = rawNodes.map((node, index) => ({
        index,
        name: node?.name ? String(node.name) : `Node ${index}`,
        children: Array.isArray(node?.children) ? node.children.filter((c: any) => typeof c === "number") : [],
    }));

    // roots are nodes never referenced as a child
    const childIndices = new Set<number>();
    for (const node of nodes) {
        for (const child of node.children) {
            childIndices.add(child);
        }
    }
    const rootNodes = nodes.filter((node) => !childIndices.has(node.index)).map((node) => node.index);

    const mapObjects = (arr: any, prefix: string): GltfObject[] =>
        (Array.isArray(arr) ? arr : []).map((item: any, index: number) => named(item, prefix, index));

    return {
        nodes,
        rootNodes,
        meshes: mapObjects(gltf?.meshes, "Mesh"),
        materials: mapObjects(gltf?.materials, "Material"),
        cameras: mapObjects(gltf?.cameras, "Camera"),
        animations: mapObjects(gltf?.animations, "Animation"),
    };
};

/** True if the model contains at least one addressable object. */
export const isGltfObjectModelEmpty = (model: GltfObjectModel | null | undefined): boolean =>
    !model ||
    (model.nodes.length === 0 &&
        model.meshes.length === 0 &&
        model.materials.length === 0 &&
        model.cameras.length === 0 &&
        model.animations.length === 0);
