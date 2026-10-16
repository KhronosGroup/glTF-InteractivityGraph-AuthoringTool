/** @jest-environment node */
import { AssetContainer, Mesh, MorphTarget, MorphTargetManager, NullEngine, Scene, SceneLoader, TransformNode, Vector3 } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { GLTFFileLoader } from "@babylonjs/loaders";
import { BasicBehaveEngine } from "../src/BasicBehaveEngine/BasicBehaveEngine";
import { BabylonDecorator } from "../src/decorators/BabylonDecorator";
import { attachSkinLoadedMetadata, buildBabylonDecoratorWorld, buildBabylonLoadedModel } from "../src/components/engineViews/babylonLoadedModel";
import { registerKHRInteractivityExtension } from "../src/loaderExtensions/KHR_interactivity";
import { TestEventBus } from "./assets/sampleAssetHarness";

function fixture(change?: (json: any) => void, extraFloats: number[] = []): Buffer {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, ...Array(9).fill(0), ...extraFloats]);
    const data = Buffer.from(positions.buffer);
    const primitive = { attributes: { POSITION: 0 }, targets: [{ POSITION: 1 }] };
    const json = {
        asset: { version: "2.0" },
        scene: 0, scenes: [{ nodes: [0, 2] }],
        nodes: [
            { name: "visible", mesh: 0 },
            { name: "memory", mesh: 0, weights: [0], translation: [5, 0, 0] },
            { name: "visible after gap", mesh: 0, weights: [9] },
            { name: "default memory", mesh: 0 },
            { name: "non-mesh" },
            { name: "plain mesh", mesh: 1 },
        ],
        meshes: [{ weights: [7], primitives: [primitive, primitive] }, { primitives: [{ attributes: { POSITION: 0 } }] }],
        buffers: [{ byteLength: data.length }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 36 }],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
            { bufferView: 1, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [0, 0, 0] },
        ],
    };
    change?.(json);
    const encoded = Buffer.from(JSON.stringify(json));
    const chunk = Buffer.alloc((encoded.length + 3) & ~3, 0x20);
    encoded.copy(chunk);
    const result = Buffer.alloc(12 + 8 + chunk.length + 8 + data.length);
    result.writeUInt32LE(0x46546c67, 0); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8);
    result.writeUInt32LE(chunk.length, 12); result.writeUInt32LE(0x4e4f534a, 16); chunk.copy(result, 20);
    result.writeUInt32LE(data.length, 20 + chunk.length); result.writeUInt32LE(0x004e4942, 24 + chunk.length);
    data.copy(result, 28 + chunk.length);
    return result;
}

test("unloaded glTF nodes retain their indices and independent morph state", async () => {
    const renderer = new NullEngine();
    const scene = new Scene(renderer);
    const engine = new BasicBehaveEngine(60, new TestEventBus());
    let container: AssetContainer | undefined;
    let decorator: BabylonDecorator | undefined;
    try {
        registerKHRInteractivityExtension();
        container = await SceneLoader.LoadAssetContainerAsync("", `data:model/gltf-binary;base64,${fixture().toString("base64")}`, scene, undefined, ".glb");
        container.addAllToScene();
        const model = buildBabylonLoadedModel(container);
        const world = buildBabylonDecoratorWorld(model);
        expect(model.assetModel!.nodes.map(node => node.index)).toEqual([0, 1, 2, 3, 4, 5]);
        expect(world.glTFNodes[2]!.name).toBe("visible after gap");
        const memory = model.assetModel!.nodes[1];
        expect(memory.native).toBeUndefined();
        expect(world.glTFNodes[1]).toBeUndefined();
        const counts = [container.transformNodes.length, container.meshes.length, scene.transformNodes.length];
        expect(buildBabylonLoadedModel(container).assetModel!.nodes[1]).toBe(memory);
        expect([container.transformNodes.length, container.meshes.length, scene.transformNodes.length]).toEqual(counts);
        decorator = new BabylonDecorator(engine, world, scene);
        expect(engine.getPathValue("/nodes.length")).toEqual([6]);
        expect(engine.getPathValue("/nodes/1/translation")).toEqual([5, 0, 0]);
        expect(engine.getPathValue("/nodes/1/weights/0")).toEqual([0]);
        expect(engine.getPathValue("/nodes/3/weights/0")).toEqual([7]);
        expect(engine.getPathValue("/nodes/1/weights.length")).toEqual([1]);
        expect(engine.isValidJsonPtr("/nodes/1/weights/1")).toBe(false);
        expect(engine.isValidJsonPtr("/nodes/4/weights/0")).toBe(false);
        expect(engine.isValidJsonPtr("/nodes/4/weights.length")).toBe(false);
        expect(engine.getPathValue("/nodes/5/weights.length")).toEqual([0]);
        expect(engine.isValidJsonPtr("/nodes/6/weights/0")).toBe(false);
        let activations = 0;
        engine.processNodeStarted = () => {
            if (++activations > 1000) throw new Error("Morph memory loop did not terminate");
        };
        engine.loadBehaveGraph({
            types: [{ signature: "float" }, { signature: "bool" }],
            variables: [{ type: 1, value: [false] }],
            declarations: ["event/onStart", "pointer/get", "math/lt", "flow/while", "math/add", "pointer/set", "variable/set"].map(op => ({ op })),
            nodes: [
                { declaration: 0, flows: { out: { node: 3, socket: "in" } } },
                { declaration: 1, configuration: { pointer: { value: ["/nodes/1/weights/0"] }, type: { value: [0] } } },
                { declaration: 2, values: { a: { node: 1, socket: "value" }, b: { type: 0, value: [3] } } },
                { declaration: 3, values: { condition: { node: 2, socket: "value" } }, flows: { loopBody: { node: 5, socket: "in" }, completed: { node: 6, socket: "in" } } },
                { declaration: 4, values: { a: { node: 1, socket: "value" }, b: { type: 0, value: [1] } } },
                { declaration: 5, configuration: { pointer: { value: ["/nodes/1/weights/0"] }, type: { value: [0] } }, values: { value: { node: 4, socket: "value" } } },
                { declaration: 6, configuration: { variables: { value: [0] } }, values: { "0": { type: 1, value: [true] } } },
            ],
        }, false);
        engine.executeEventQueueTick();
        expect(engine.variables[0].value).toEqual([true]);
        expect(engine.getPathValue("/nodes/1/weights")).toEqual([3]);
        expect(engine.getPathValue("/nodes/3/weights")).toEqual([7]);
        expect(engine.getPathValue("/nodes/0/weights")).toEqual([7]);
        expect(engine.getPathValue("/nodes/2/weights")).toEqual([9]);
        expect(buildBabylonLoadedModel(container).assetModel!.nodes[1].weights).toEqual([3]);
        engine.setPathValue("/nodes/2/weights", [4]);
        expect(world.glTFNodes[2]!.getChildMeshes(true).map(mesh => (mesh as Mesh).morphTargetManager!.getTarget(0).influence)).toEqual([4, 4]);
        engine.setPathValue("/nodes/0/weights/0", [6]);
        expect(world.glTFNodes[0]!.getChildMeshes(true).map(mesh => (mesh as Mesh).morphTargetManager!.getTarget(0).influence)).toEqual([6, 6]);
        decorator.dispose(); decorator = undefined;
        container.dispose(); container = undefined;
        expect(scene.meshes).toHaveLength(0);
        expect(scene.transformNodes).toHaveLength(0);
    } finally {
        decorator?.dispose(); engine.dispose(); container?.dispose(); scene.dispose(); renderer.dispose();
    }
}, 30000);

test.each([false, true])("logical nodes retain hierarchy, matrix and extension state (right handed: %s)", async rightHanded => {
    const renderer = new NullEngine();
    const scene = new Scene(renderer);
    scene.useRightHandedSystem = rightHanded;
    const engine = new BasicBehaveEngine(60, new TestEventBus());
    let container: AssetContainer | undefined;
    let decorator: BabylonDecorator | undefined;
    try {
        registerKHRInteractivityExtension();
        const bytes = fixture(json => {
            json.nodes[1].children = [3];
            json.nodes[3].matrix = [1, 0, 0, 0, 0.5, 1, 0, 0, 0, 0, 1, 0, 2, 3, 4, 1];
            json.nodes[1].extensions = {
                KHR_node_visibility: { visible: false },
                KHR_node_selectability: { selectable: false },
                KHR_node_hoverability: {},
            };
            json.nodes[1].camera = 0;
            json.cameras = [{ type: "perspective", perspective: { yfov: 0.7, znear: 0.1 } }];
            json.extensionsUsed = ["KHR_node_visibility", "KHR_node_selectability", "KHR_node_hoverability"];
        });
        container = await SceneLoader.LoadAssetContainerAsync("", `data:model/gltf-binary;base64,${bytes.toString("base64")}`, scene, undefined, ".glb");
        const model = buildBabylonLoadedModel(container);
        const nativeCount = container.meshes.length;
        container.addAllToScene();
        decorator = new BabylonDecorator(engine, buildBabylonDecoratorWorld(model), scene);
        expect(engine.getPathValue("/nodes/1/extensions/KHR_node_visibility/visible")).toEqual([false]);
        expect(engine.getPathValue("/nodes/1/extensions/KHR_node_selectability/selectable")).toEqual([false]);
        expect(engine.getPathValue("/nodes/1/extensions/KHR_node_hoverability/hoverable")).toEqual([true]);
        expect(engine.isValidJsonPtr("/nodes/0/extensions/KHR_node_visibility/visible")).toBe(false);
        expect(engine.getPathValue("/nodes/3/parent")).toEqual(["/nodes/1"]);
        expect(engine.getParentNodeIndex(3)).toBe(1);
        expect(engine.getPathValue("/nodes/1/children/0")).toEqual(["/nodes/3"]);
        expect(engine.isValidJsonPtr("/nodes/1/children/1")).toBe(false);
        expect(engine.isValidJsonPtr("/nodes/6/translation")).toBe(false);
        expect(engine.isValidJsonPtr("/nodes/3/rotation")).toBe(false);
        expect(engine.isValidJsonPtr("/nodes/3/scale")).toBe(false);
        expect(engine.getPathValue("/nodes/3/globalMatrix").slice(12, 15)).toEqual([7, 3, 4]);
        engine.setPathValue("/nodes/3/translation", [8, 9, 10]);
        expect(engine.getPathValue("/nodes/3/matrix")[4]).toBe(0.5);
        expect(engine.getPathValue("/nodes/3/globalMatrix").slice(12, 15)).toEqual([13, 9, 10]);
        expect(engine.getPathValue("/cameras/0/perspective/yfov")).toEqual([0.7]);
        expect(engine.isValidJsonPtr("/cameras/0/perspective/zfar")).toBe(false);
        expect(scene.cameras).toHaveLength(0);
        expect(scene.activeCamera == null).toBe(true);
        engine.setPathValue("/cameras/0/perspective/yfov", [0.8]);
        engine.setPathValue("/nodes/1/extensions/KHR_node_visibility/visible", [true]);
        expect(engine.getPathValue("/nodes/1/extensions/KHR_node_visibility/visible")).toEqual([true]);
        expect(container.meshes).toHaveLength(nativeCount);
        const native = model.nodes[2] as TransformNode;
        native.position = new Vector3(2, 3, 4);
        expect(engine.getPathValue("/nodes/2/translation")).toEqual([2, 3, 4]);
        expect(engine.getPathValue("/nodes/2/globalMatrix").slice(12, 15)).toEqual([2, 3, 4]);
        native.getChildMeshes(true)[0].morphTargetManager!.getTarget(0).influence = 0.25;
        expect(engine.getPathValue("/nodes/2/weights/0")).toEqual([0.25]);
        const again = buildBabylonLoadedModel(container);
        expect(again.assetModel).toBe(model.assetModel);
        expect(again.nodes[2]).toBe(native);
        expect(again.assetModel!.nodes[1].visible).toBe(true);
        expect(again.assetModel!.cameras[0].perspective!.yfov).toBe(0.8);
        const rebuiltEngine = new BasicBehaveEngine(60, new TestEventBus());
        const rebuiltDecorator = new BabylonDecorator(rebuiltEngine, buildBabylonDecoratorWorld(again), scene);
        expect(rebuiltEngine.getPathValue("/cameras/0/perspective/yfov")).toEqual([0.8]);
        expect(rebuiltEngine.getPathValue("/nodes/1/extensions/KHR_node_visibility/visible")).toEqual([true]);
        rebuiltDecorator.dispose();
    } finally {
        decorator?.dispose(); engine.dispose(); container?.dispose(); scene.dispose(); renderer.dispose();
    }
});

test("asset state and camera bindings are isolated when containers share a scene", async () => {
    const renderer = new NullEngine();
    const scene = new Scene(renderer);
    const engines = [new BasicBehaveEngine(60, new TestEventBus()), new BasicBehaveEngine(60, new TestEventBus())];
    const containers: AssetContainer[] = [];
    const decorators: BabylonDecorator[] = [];
    try {
        registerKHRInteractivityExtension();
        for (const [index, yfov] of [0.7, 1.2].entries()) {
            const bytes = fixture(json => {
                json.nodes[0].camera = 0;
                json.cameras = [{ type: "perspective", perspective: { yfov, znear: 0.1 } }];
                json.nodes[1].weights = [index + 1];
            });
            containers.push(await SceneLoader.LoadAssetContainerAsync("", `data:model/gltf-binary;base64,${bytes.toString("base64")}`, scene, undefined, ".glb"));
            containers[index].addAllToScene();
        }
        // Build the first model after the second load has replaced scene metadata.
        const models = containers.map(buildBabylonLoadedModel);
        models.forEach((model, index) => decorators.push(new BabylonDecorator(engines[index], buildBabylonDecoratorWorld(model), scene)));
        expect(engines.map(engine => engine.getPathValue("/cameras/0/perspective/yfov"))).toEqual([[0.7], [1.2]]);
        engines[0].setPathValue("/cameras/0/perspective/yfov", [0.9]);
        engines[0].setPathValue("/nodes/1/weights/0", [5]);
        expect(engines[1].getPathValue("/cameras/0/perspective/yfov")).toEqual([1.2]);
        expect(engines[1].getPathValue("/nodes/1/weights/0")).toEqual([2]);
        expect(containers[0].cameras[0].fov).toBe(0.9);
        containers[0].dispose();
        expect(containers[1].cameras[0].isDisposed()).toBe(false);
        expect(engines[1].getPathValue("/nodes/1/weights/0")).toEqual([2]);
    } finally {
        decorators.forEach(decorator => decorator.dispose()); engines.forEach(engine => engine.dispose());
        containers.forEach(container => container.dispose()); scene.dispose(); renderer.dispose();
    }
});

test.each(["LINEAR", "STEP", "CUBICSPLINE"])("Babylon %s animations update logical and loaded targets together", async interpolation => {
    const renderer = new NullEngine();
    const scene = new Scene(renderer);
    const engine = new BasicBehaveEngine(60, new TestEventBus());
    let container: AssetContainer | undefined;
    let decorator: BabylonDecorator | undefined;
    try {
        registerKHRInteractivityExtension();
        const cubic = interpolation === "CUBICSPLINE";
        const translations = cubic ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 30, 0, 0, 0] : [0, 0, 0, 10, 20, 30];
        const weights = cubic ? [0, 0, 0, 0, 1, 0] : [0, 1];
        const bytes = fixture(json => {
            json.bufferViews.push({ buffer: 0, byteOffset: 72, byteLength: 8 },
                { buffer: 0, byteOffset: 80, byteLength: translations.length * 4 },
                { buffer: 0, byteOffset: 80 + translations.length * 4, byteLength: weights.length * 4 });
            json.accessors.push(
                { bufferView: 2, componentType: 5126, count: 2, type: "SCALAR", min: [0], max: [1] },
                { bufferView: 3, componentType: 5126, count: translations.length / 3, type: "VEC3" },
                { bufferView: 4, componentType: 5126, count: weights.length, type: "SCALAR" },
            );
            json.animations = [{
                samplers: [{ input: 2, output: 3, interpolation }, { input: 2, output: 4, interpolation }],
                channels: [
                    { sampler: 0, target: { node: 1, path: "translation" } },
                    { sampler: 1, target: { node: 1, path: "weights" } },
                    { sampler: 0, target: { node: 2, path: "translation" } },
                    { sampler: 1, target: { node: 2, path: "weights" } },
                ],
            }];
        }, [0, 1, ...translations, ...weights]);
        container = await SceneLoader.LoadAssetContainerAsync("", `data:model/gltf-binary;base64,${bytes.toString("base64")}`, scene, undefined, ".glb");
        container.addAllToScene();
        const model = buildBabylonLoadedModel(container);
        decorator = new BabylonDecorator(engine, buildBabylonDecoratorWorld(model), scene);
        const animation = model.animations[0];
        animation.stop(); animation.start(false); animation.pause(); animation.goToFrame(30);
        const expectedTranslation = interpolation === "STEP" ? [0, 0, 0] : [5, 10, 15];
        const expectedWeight = interpolation === "STEP" ? 0 : 0.5;
        expect(animation.targetedAnimations).toHaveLength(5);
        expect(engine.getPathValue("/nodes/1/translation")).toEqual(expectedTranslation);
        expect(engine.getPathValue("/nodes/2/translation")).toEqual(expectedTranslation);
        expect(engine.getPathValue("/nodes/1/weights/0")).toEqual([expectedWeight]);
        expect(engine.getPathValue("/nodes/2/weights/0")).toEqual([expectedWeight]);
        expect(model.assetModel!.nodes[1].native).toBeUndefined();
        expect(buildBabylonLoadedModel(container).assetModel!.nodes[1].position.asArray()).toEqual(expectedTranslation);
        container.dispose(); container = undefined;
        expect(scene.animationGroups).toHaveLength(0);
        expect(scene.animatables).toHaveLength(0);
    } finally {
        decorator?.dispose(); engine.dispose(); container?.dispose(); scene.dispose(); renderer.dispose();
    }
});

test("loaded primitive visibility and picking follow logical ancestry and local flags", async () => {
    const renderer = new NullEngine();
    const scene = new Scene(renderer);
    const engine = new BasicBehaveEngine(60, new TestEventBus());
    let container: AssetContainer | undefined;
    let decorator: BabylonDecorator | undefined;
    try {
        registerKHRInteractivityExtension();
        const bytes = fixture(json => {
            json.scenes[0].nodes = [0];
            json.nodes[0].children = [2];
            for (const index of [0, 2]) json.nodes[index].extensions = {
                KHR_node_visibility: { visible: index === 0 },
                KHR_node_selectability: { selectable: true },
                KHR_node_hoverability: { hoverable: true },
            };
            json.extensionsUsed = ["KHR_node_visibility", "KHR_node_selectability", "KHR_node_hoverability"];
        });
        container = await SceneLoader.LoadAssetContainerAsync("", `data:model/gltf-binary;base64,${bytes.toString("base64")}`, scene, undefined, ".glb");
        container.addAllToScene();
        const model = buildBabylonLoadedModel(container);
        decorator = new BabylonDecorator(engine, buildBabylonDecoratorWorld(model), scene);
        const parent = model.assetModel!.nodes[0], child = model.assetModel!.nodes[2];
        expect(parent.meshes.map(mesh => mesh.isVisible)).toEqual([true, true]);
        expect(child.meshes.map(mesh => mesh.isVisible)).toEqual([false, false]);
        engine.setPathValue("/nodes/0/extensions/KHR_node_selectability/selectable", [false]);
        expect([...parent.meshes, ...child.meshes].every(mesh => !mesh.isPickable)).toBe(true);
        engine.setPathValue("/nodes/0/extensions/KHR_node_selectability/selectable", [true]);
        expect([...parent.meshes, ...child.meshes].every(mesh => mesh.isPickable)).toBe(true);
        engine.setPathValue("/nodes/0/extensions/KHR_node_visibility/visible", [false]);
        engine.setPathValue("/nodes/0/extensions/KHR_node_visibility/visible", [true]);
        expect(child.meshes.every(mesh => !mesh.isVisible)).toBe(true);
        expect(engine.getPathValue("/nodes/2/extensions/KHR_node_visibility/visible")).toEqual([false]);
    } finally {
        decorator?.dispose(); engine.dispose(); container?.dispose(); scene.dispose(); renderer.dispose();
    }
});


test("skinned node TRS animations update its logical transform and children, not reparented geometry", async () => {
    const renderer = new NullEngine();
    const scene = new Scene(renderer);
    const engine = new BasicBehaveEngine(60, new TestEventBus());
    let container: AssetContainer | undefined;
    let decorator: BabylonDecorator | undefined;
    try {
        registerKHRInteractivityExtension();
        SceneLoader.OnPluginActivatedObservable.addOnce(loader => attachSkinLoadedMetadata(loader as GLTFFileLoader));
        const bytes = fixture(json => {
            json.nodes[2].mesh = 2;
            json.meshes.push({ primitives: json.meshes[0].primitives.map((primitive: any) => ({
                ...primitive, attributes: { POSITION: 0, JOINTS_0: 4, WEIGHTS_0: 5 },
            })) });
            json.nodes[2].skin = 0;
            json.nodes[2].children = [4];
            json.nodes[4].translation = [1, 0, 0];
            json.skins = [{ joints: [4], skeleton: 4 }];
            json.bufferViews.push({ buffer: 0, byteOffset: 72, byteLength: 8 }, { buffer: 0, byteOffset: 80, byteLength: 24 });
            json.accessors.push({ bufferView: 2, componentType: 5126, count: 2, type: "SCALAR", min: [0], max: [1] },
                { bufferView: 3, componentType: 5126, count: 2, type: "VEC3" });
            json.bufferViews.push({ buffer: 0, byteOffset: 104, byteLength: 24 }, { buffer: 0, byteOffset: 128, byteLength: 48 });
            json.accessors.push({ bufferView: 4, componentType: 5123, count: 3, type: "VEC4" },
                { bufferView: 5, componentType: 5126, count: 3, type: "VEC4" });
            json.animations = [{ samplers: [{ input: 2, output: 3 }], channels: [{ sampler: 0, target: { node: 2, path: "translation" } }] }];
        }, [0, 1, 0, 0, 0, 10, 0, 0, ...Array(6).fill(0), ...Array(3).fill([1, 0, 0, 0]).flat()]);
        container = await SceneLoader.LoadAssetContainerAsync("", `data:model/gltf-binary;base64,${bytes.toString("base64")}`, scene, undefined, ".glb");
        container.addAllToScene();
        const model = buildBabylonLoadedModel(container);
        decorator = new BabylonDecorator(engine, buildBabylonDecoratorWorld(model), scene);
        const animation = model.animations[0];
        animation.stop(); animation.start(false); animation.pause(); animation.goToFrame(30);
        expect(engine.getPathValue("/nodes/2/translation")).toEqual([5, 0, 0]);
        expect(engine.getPathValue("/nodes/4/globalMatrix").slice(12, 15)).toEqual([6, 0, 0]);
        const native = model.nodes[2] as TransformNode;
        expect(native.position.asArray()).toEqual([5, 0, 0]);
        expect(native.metadata.skinnedMesh.position.asArray()).toEqual([0, 0, 0]);
        engine.setPathValue("/nodes/2/weights/0", [0.25]);
        expect(model.assetModel!.nodes[2].morphManagers.map(manager => manager.getTarget(0).influence)).toEqual([0.25, 0.25]);
    } finally {
        decorator?.dispose(); engine.dispose(); container?.dispose(); scene.dispose(); renderer.dispose();
    }
});


test("direct Babylon worlds keep node-owned morphs and host world transforms", () => {
    const renderer = new NullEngine();
    const scene = new Scene(renderer);
    const engine = new BasicBehaveEngine(60, new TestEventBus());
    const host = new TransformNode("host", scene);
    host.position.x = 10;
    const parent = new Mesh("parent", scene);
    const child = new Mesh("child", scene);
    parent.parent = host;
    child.parent = parent;
    child.position.x = 2;
    for (const [index, mesh] of [parent, child].entries()) {
        mesh.morphTargetManager = new MorphTargetManager(scene);
        mesh.morphTargetManager.addTarget(new MorphTarget("shape", index + 1, scene));
    }
    const decorator = new BabylonDecorator(engine, { glTFNodes: [parent, undefined, child], meshes: [parent, child], materials: [], animations: [] }, scene);
    try {
        expect(engine.getPathValue("/nodes/0/weights")).toEqual([1]);
        expect(engine.getPathValue("/nodes/2/weights")).toEqual([2]);
        expect(engine.getPathValue("/nodes.length")).toEqual([3]);
        expect(engine.isValidJsonPtr("/nodes/1/translation")).toBe(false);
        expect(engine.isValidJsonPtr("/nodes/0/mesh")).toBe(false);
        engine.setPathValue("/nodes/0/weights/0", [3]);
        expect(child.morphTargetManager!.getTarget(0).influence).toBe(2);
        engine.setPathValue("/nodes/2/weights/0", [4]);
        expect(parent.morphTargetManager!.getTarget(0).influence).toBe(3);
        expect(engine.getPathValue("/nodes/2/globalMatrix").slice(12, 15)).toEqual([-12, 0, 0]);
        scene.useRightHandedSystem = true;
        expect(engine.getPathValue("/nodes/2/globalMatrix").slice(12, 15)).toEqual([12, 0, 0]);
    } finally {
        decorator.dispose(); scene.dispose(); renderer.dispose();
    }
});
