/**
 * An engine-agnostic snapshot of the loaded glTF's addressable objects, used to power the ref-socket
 * value picker in the authoring UI. Built from the raw glTF JSON (available from the Babylon loader),
 * so names, indices and the node hierarchy are all faithful.
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

/** A mesh primitive, addressed as "/meshes/{meshIndex}/primitives/{primitiveIndex}" (two-level index, grouped by mesh). */
export interface GltfMeshPrimitive {
    meshIndex: number;
    meshName: string;
    primitiveIndex: number;
    name: string;
    pointer: string;
}

export interface GltfObjectModel {
    nodes: GltfObjectNode[];
    /** top-level node indices (nodes that are not a child of any other node) */
    rootNodes: number[];
    meshes: GltfObject[];
    materials: GltfObject[];
    cameras: GltfObject[];
    animations: GltfObject[];
    /** KHR_lights_punctual lights, stored under /extensions/KHR_lights_punctual/lights */
    lights: GltfObject[];
    /** mesh primitives, grouped by their owning mesh */
    meshPrimitives: GltfMeshPrimitive[];
}

/** Category metadata: how each category maps to a JSON pointer prefix and a tree/list/grouped presentation. */
export interface RefCategory {
    id: keyof Pick<GltfObjectModel, "nodes" | "meshes" | "materials" | "cameras" | "animations" | "lights" | "meshPrimitives">;
    label: string;
    /** JSON pointer prefix, e.g. "/nodes" -> a selection yields "/nodes/3". Unused for grouped categories. */
    pointerPrefix: string;
    /** nodes are shown as a hierarchy, everything else as a flat list */
    tree: boolean;
    /** mesh primitives are shown as a flat list grouped under their owning mesh's name */
    grouped?: boolean;
}

export const REF_CATEGORIES: RefCategory[] = [
    { id: "nodes", label: "Nodes", pointerPrefix: "/nodes", tree: true },
    { id: "meshes", label: "Meshes", pointerPrefix: "/meshes", tree: false },
    { id: "meshPrimitives", label: "Mesh primitives", pointerPrefix: "/meshes", tree: false, grouped: true },
    { id: "materials", label: "Materials", pointerPrefix: "/materials", tree: false },
    { id: "cameras", label: "Cameras", pointerPrefix: "/cameras", tree: false },
    { id: "lights", label: "Lights", pointerPrefix: "/extensions/KHR_lights_punctual/lights", tree: false },
    { id: "animations", label: "Animations", pointerPrefix: "/animations", tree: false },
];

const named = (item: any, fallbackPrefix: string, index: number): GltfObject => ({
    index,
    name: item?.name ? String(item.name) : `${fallbackPrefix} ${index}`,
});

/** Build the object model snapshot from raw glTF JSON. Safe against missing/partial arrays. */
export const buildGltfObjectModel = (gltf: any): GltfObjectModel => {
    const rawNodes: any[] = Array.isArray(gltf?.nodes) ? gltf.nodes : [];
    const rawMeshes: any[] = Array.isArray(gltf?.meshes) ? gltf.meshes : [];

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

    const meshPrimitives: GltfMeshPrimitive[] = rawMeshes.flatMap((mesh, meshIndex) => {
        const meshName = mesh?.name ? String(mesh.name) : `Mesh ${meshIndex}`;
        const primitives: any[] = Array.isArray(mesh?.primitives) ? mesh.primitives : [];
        return primitives.map((_primitive, primitiveIndex) => ({
            meshIndex,
            meshName,
            primitiveIndex,
            name: `Primitive ${primitiveIndex}`,
            pointer: `/meshes/${meshIndex}/primitives/${primitiveIndex}`,
        }));
    });

    return {
        nodes,
        rootNodes,
        meshes: mapObjects(gltf?.meshes, "Mesh"),
        materials: mapObjects(gltf?.materials, "Material"),
        cameras: mapObjects(gltf?.cameras, "Camera"),
        animations: mapObjects(gltf?.animations, "Animation"),
        lights: mapObjects(gltf?.extensions?.KHR_lights_punctual?.lights, "Light"),
        meshPrimitives,
    };
};

/** True if the model contains at least one addressable object. */
export const isGltfObjectModelEmpty = (model: GltfObjectModel | null | undefined): boolean =>
    !model ||
    (model.nodes.length === 0 &&
        model.meshes.length === 0 &&
        model.materials.length === 0 &&
        model.cameras.length === 0 &&
        model.animations.length === 0 &&
        model.lights.length === 0 &&
        model.meshPrimitives.length === 0);
