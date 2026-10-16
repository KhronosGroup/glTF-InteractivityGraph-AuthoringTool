import { MorphTargetManager, Quaternion, Vector3 } from "@babylonjs/core";
import { IJsonPtrEntry } from "../BasicBehaveEngine/IBehaveEngine";
import { BabylonAssetModel } from "../components/engineViews/babylonAssetModel";

export function createBabylonAssetNodePointers(model: BabylonAssetModel): Map<string, IJsonPtrEntry> {
    const bindings = new Map<string, IJsonPtrEntry>();
    const bind = (path: string, typeName: string, getValue: () => unknown, set?: (value: any) => void): void => {
        bindings.set(path, { typeName, readOnly: !set, getValue, setValue: (_path, value) => set?.(value) });
    };
    const ref = (path: string, category: string, index: number | undefined): void => {
        if (index !== undefined) bind(path, "ref", () => [`/${category}/${index}`]);
    };
    const updateFlags = (indices = model.nodes.flatMap(node => [node.index])): void => {
        for (const index of indices) {
            const node = model.nodes[index];
            if (!node.native) continue;
            let visible = node.visible, selectable = node.selectable, hoverable = node.hoverable;
            for (let parent = node.parent; parent !== undefined; parent = model.nodes[parent].parent) {
                const ancestor = model.nodes[parent];
                visible &&= ancestor.visible; selectable &&= ancestor.selectable; hoverable &&= ancestor.hoverable;
            }
            node.native.metadata = { ...node.native.metadata, selectable: node.selectable, hoverable: node.hoverable };
            for (const mesh of node.meshes) {
                mesh.isVisible = visible;
                mesh.isPickable = selectable;
                mesh.metadata = { ...mesh.metadata, compositeHoverability: hoverable };
            }
        }
    };
    updateFlags();
    bind("/nodes.length", "int", () => [model.nodes.length]);
    model.nodes.forEach(node => {
        const prefix = `/nodes/${node.index}`;
        const target = () => node.native ?? node;
        bind(`${prefix}/translation`, "float3", () => target().position.asArray(), value => target().position.copyFromFloats(value[0], value[1], value[2]));
        if (!node.definition.matrix) {
            bind(`${prefix}/rotation`, "float4", () => (target().rotationQuaternion ?? Quaternion.FromEulerVector(node.native!.rotation)).asArray(), value => {
                target().rotationQuaternion = Quaternion.FromArray(value);
            });
            bind(`${prefix}/scale`, "float3", () => target().scaling.asArray(), value => { target().scaling = Vector3.FromArray(value); });
        }
        bind(`${prefix}/matrix`, "float4x4", () => Array.from(model.localMatrix(node.index).m));
        bind(`${prefix}/globalMatrix`, "float4x4", () => Array.from(model.globalMatrix(node.index).m));
        ref(`${prefix}/parent`, "nodes", node.parent);
        ref(`${prefix}/mesh`, "meshes", node.definition.mesh);
        ref(`${prefix}/camera`, "cameras", node.definition.camera);
        ref(`${prefix}/skin`, "skins", node.definition.skin);
        const children = node.definition.children ?? [];
        bind(`${prefix}/children.length`, "int", () => [children.length]);
        children.forEach((child, index) => ref(`${prefix}/children/${index}`, "nodes", child));
        ref(`${prefix}/extensions/KHR_lights_punctual/light`, "extensions/KHR_lights_punctual/lights", node.definition.extensions?.KHR_lights_punctual?.light);
        for (const [extension, property] of [["visibility", "visible"], ["selectability", "selectable"], ["hoverability", "hoverable"]] as const) {
            if (node.definition.extensions?.[`KHR_node_${extension}`] === undefined) continue;
            bind(`${prefix}/extensions/KHR_node_${extension}/${property}`, "bool", () => [node[property]], value => {
                node[property] = Boolean(Array.isArray(value) ? value[0] : value);
                const descendants = (index: number): number[] => [index, ...(model.nodes[index].definition.children ?? []).flatMap(descendants)];
                updateFlags(descendants(node.index));
            });
        }
        if (node.definition.mesh === undefined && node.meshes.length === 0) return;
        bindBabylonMorphPointers(`${prefix}/weights`, node.weights, node.morphManagers, bind);
    });
    return bindings;
}

type Bind = (path: string, type: string, get: () => number[], set?: (value: number[]) => void) => void;
function bindBabylonMorphPointers(prefix: string, weights: number[], managers: readonly MorphTargetManager[], bind: Bind): void {
    const count = weights.length;
    const read = (index: number): number => managers[0]?.getTarget(index).influence ?? weights[index];
    const write = (index: number, value: number): void => {
        weights[index] = value;
        for (const manager of managers) manager.getTarget(index).influence = value;
    };
    bind(prefix + ".length", "int", () => [count]);
    if (count === 0) return;
    bind(prefix, "float[]", () => weights.map((_, index) => read(index)), value => {
        for (let index = 0; index < count; index++) write(index, Number(value[index]));
    });
    for (let index = 0; index < count; index++) {
        bind(`${prefix}/${index}`, "float", () => [read(index)], value => write(index, Number(Array.isArray(value) ? value[0] : value)));
    }
}
