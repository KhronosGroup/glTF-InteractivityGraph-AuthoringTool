import { AbstractMesh, Animation, Camera, Matrix, MorphTargetManager, Node, Quaternion, TransformNode, Vector3 } from "@babylonjs/core";
import type { IGLTF, INode, IScene, ISkin } from "@babylonjs/loaders/glTF/2.0/glTFLoaderInterfaces";

type NodeDefinition = Pick<INode, "name" | "mesh" | "camera" | "skin" | "children" | "weights" | "translation" | "rotation" | "scale" | "matrix" | "extensions">;
export interface BabylonAssetNode {
    readonly definition: NodeDefinition;
    readonly index: number;
    readonly parent: number | undefined;
    position: Vector3;
    rotationQuaternion: Quaternion;
    scaling: Vector3;
    weights: number[];
    visible: boolean;
    selectable: boolean;
    hoverable: boolean;
    animations: Animation[];
    native?: TransformNode;
    morphManagers: MorphTargetManager[];
    meshes: AbstractMesh[];
}

/** Addressable glTF state belongs to the asset, whether or not a node is rendered. */
export class BabylonAssetModel {
    readonly nodes: BabylonAssetNode[];
    readonly cameras: NonNullable<IGLTF["cameras"]>;
    readonly nativeCameras: Camera[] = [];
    readonly structure: {
        nodes: NodeDefinition[];
        meshes: { primitives: { material?: number }[] }[];
        skins: Pick<ISkin, "joints" | "skeleton">[];
        scenes: Pick<IScene, "nodes">[];
        scene: number;
    };
    readonly asset: IGLTF["asset"];
    readonly extensionsUsed: string[];

    constructor(gltf: IGLTF) {
        const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
        const definitions = (gltf.nodes ?? []).map(({ name, mesh, camera, skin, children, weights, translation, rotation, scale, matrix, extensions }) =>
            clone({ name, mesh, camera, skin, children, weights, translation, rotation, scale, matrix, extensions }));
        const parents = new Map<number, number>();
        definitions.forEach((node, index) => node.children?.forEach(child => parents.set(child, index)));
        this.structure = {
            nodes: definitions,
            meshes: (gltf.meshes ?? []).map(mesh => ({ primitives: mesh.primitives.map(({ material }) => ({ material })) })),
            skins: (gltf.skins ?? []).map(({ joints, skeleton }) => ({ joints: joints.slice(), skeleton })),
            scenes: (gltf.scenes ?? []).map(({ nodes }) => ({ nodes: nodes?.slice() })),
            scene: gltf.scene ?? 0,
        };
        this.cameras = clone(gltf.cameras ?? []);
        this.asset = clone(gltf.asset);
        this.extensionsUsed = [...gltf.extensionsUsed ?? []];
        this.nodes = definitions.map((definition, index) => {
            const mesh = definition.mesh === undefined ? undefined : gltf.meshes?.[definition.mesh];
            const position = Vector3.FromArray(definition.translation ?? [0, 0, 0]);
            const rotationQuaternion = Quaternion.FromArray(definition.rotation ?? [0, 0, 0, 1]);
            const scaling = Vector3.FromArray(definition.scale ?? [1, 1, 1]);
            if (definition.matrix) Matrix.FromArray(definition.matrix).decompose(scaling, rotationQuaternion, position);
            return {
                definition, index, parent: parents.get(index), position, rotationQuaternion, scaling,
                weights: Array.from({ length: mesh?.primitives[0]?.targets?.length ?? 0 }, (_, slot) => definition.weights?.[slot] ?? mesh?.weights?.[slot] ?? 0),
                visible: definition.extensions?.KHR_node_visibility?.visible ?? true,
                selectable: definition.extensions?.KHR_node_selectability?.selectable ?? true,
                hoverable: definition.extensions?.KHR_node_hoverability?.hoverable ?? true,
                animations: [], morphManagers: [], meshes: [],
            };
        });
    }

    bindNode(index: number, native: TransformNode, nodes: readonly (Node | undefined)[]): void {
        const node = this.nodes[index];
        if (!node || node.native === native) return;
        node.native = native;
        const owner: TransformNode = native.metadata?.skinnedMesh ?? native;
        const meshes = [owner, ...owner.getChildMeshes(true)].filter((mesh): mesh is AbstractMesh => mesh instanceof AbstractMesh &&
            (mesh === owner || !nodes.includes(mesh)));
        node.meshes = meshes;
        node.morphManagers = [...new Set(meshes.map(mesh => mesh.morphTargetManager).filter((manager): manager is MorphTargetManager => manager !== null))];
    }

    localMatrix(index: number): Matrix {
        const node = this.nodes[index];
        const target = node.native ?? node;
        // Matrix-authored nodes retain shear; only translation is mutable in the object model.
        if (node.definition.matrix) {
            const matrix = Matrix.FromArray(node.definition.matrix);
            matrix.setTranslation(target.position);
            return matrix;
        }
        return Matrix.Compose(target.scaling, target.rotationQuaternion ?? Quaternion.FromEulerVector((target as TransformNode).rotation), target.position);
    }

    globalMatrix(index: number): Matrix {
        const node = this.nodes[index];
        const local = this.localMatrix(index);
        return node.parent === undefined ? local : local.multiply(this.globalMatrix(node.parent));
    }
}

const assetModels = new WeakMap<TransformNode, BabylonAssetModel>();
export function attachBabylonAssetModel(root: TransformNode, model: BabylonAssetModel): void { assetModels.set(root, model); }
export function getBabylonAssetModel(root: TransformNode | undefined): BabylonAssetModel | undefined { return root && assetModels.get(root); }
