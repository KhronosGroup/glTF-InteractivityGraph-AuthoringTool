import { Bone, FreeCamera, Mesh, NullEngine, PBRMaterial, Scene, Skeleton, TransformNode, Vector3 } from "@babylonjs/core";
import { BasicBehaveEngine } from "../src/BasicBehaveEngine/BasicBehaveEngine";
import { DOMEventBus } from "../src/BasicBehaveEngine/eventBuses/DOMEventBus";
import { BabylonDecorator } from "../src/decorators/BabylonDecorator";
import { createGlTFObjectModelFromGltf, GlTFObjectModelDecorator } from "../src/objectModel/glTFObjectModel";
import { KHR_interactivity } from "../src/loaderExtensions/KHR_interactivity";
import type { GLTFLoader } from "@babylonjs/loaders/glTF/2.0";

describe("structural reference pointers", () => {
    const gltf = {
        asset: { version: "2.0" },
        scene: 1,
        scenes: [{ nodes: [0, 2] }, { nodes: [2] }],
        nodes: [{ children: [1], camera: 0 }, { mesh: 0, skin: 1 }, {}],
        cameras: [{ type: "perspective", perspective: { yfov: 1, znear: 0.1 } }],
        meshes: [{ primitives: [{ material: 0 }, {}, { material: 1 }, { material: 0 }] }],
        materials: [{}, {}],
        skins: [{ joints: [0] }, { joints: [0, 1], skeleton: 0 }],
    };

    it("does not retain loader runtime objects in the source structure", () => {
        const renderer = new NullEngine();
        const scene = new Scene(renderer);
        const source = JSON.parse(JSON.stringify(gltf));
        try {
            new KHR_interactivity({ gltf: source, babylonScene: scene } as unknown as GLTFLoader).onLoading();
            source.nodes[0].babylonScene = scene;
            source.nodes[0].children.push(2);
            source.skins[1].joints.push(2);
            source.scenes[0].nodes.push(1);
            expect(() => JSON.stringify(scene.metadata.gltfStructure)).not.toThrow();
            expect(scene.metadata.gltfStructure.nodes[0].children).toEqual([1]);
            expect(scene.metadata.gltfStructure.skins[1].joints).toEqual([0, 1]);
            expect(scene.metadata.gltfStructure.scenes[0].nodes).toEqual([0, 2]);
        } finally {
            scene.dispose();
            renderer.dispose();
        }
    });

    it.each(["core", "Babylon source JSON", "Babylon runtime metadata"])("%s resolves only existing references", adapter => {
        const engine = new BasicBehaveEngine(60, new DOMEventBus());
        let dispose: () => void;
        if (adapter === "core") {
            const decorator = new GlTFObjectModelDecorator(engine, createGlTFObjectModelFromGltf(gltf));
            dispose = () => decorator.dispose();
        } else {
            const renderer = new NullEngine();
            const scene = new Scene(renderer);
            const nodes = [new TransformNode("parent", scene), new Mesh("child", scene), new TransformNode("root", scene)];
            nodes.forEach((node, index) => { node.metadata = { nodeIndex: index }; });
            const camera = new FreeCamera("camera", Vector3.Zero(), scene);
            camera.parent = nodes[0];
            Object.assign(camera, { _internalMetadata: { gltf: { pointers: ["/cameras/0"] } } });
            nodes[1].parent = nodes[0];
            const materials = [new PBRMaterial("first", scene), new PBRMaterial("second", scene)];
            const child = nodes[1] as Mesh;
            child.material = materials[0];
            Object.assign(child, { _internalMetadata: { gltf: { pointers: ["/meshes/0/primitives/0"] } } });
            const primitive = new Mesh("primitive", scene);
            primitive.parent = child;
            primitive.material = materials[1];
            Object.assign(primitive, { _internalMetadata: { gltf: { pointers: ["/meshes/0/primitives/2"] } } });
            const skeleton = new Skeleton("skin", "skeleton1", scene);
            child.skeleton = skeleton;
            const rootBone = new Bone("root", skeleton, null, undefined, undefined, undefined, 0);
            rootBone.linkTransformNode(nodes[0]);
            new Bone("child", skeleton, rootBone, undefined, undefined, undefined, 1).linkTransformNode(nodes[1]);
            if (adapter === "Babylon source JSON") {
                new KHR_interactivity({ gltf, babylonScene: scene } as unknown as GLTFLoader).onLoading();
            }
            const decorator = new BabylonDecorator(engine, { glTFNodes: nodes, materials, meshes: [child, primitive], animations: [] }, scene);
            dispose = () => { decorator.dispose(); scene.dispose(); renderer.dispose(); };
        }

        try {
            const references: Record<string, string | null> = {
                "/nodes/0/camera": "/cameras/0",
                "/nodes/1/mesh": "/meshes/0",
                "/nodes/1/skin": "/skins/1",
                "/nodes/1/parent": "/nodes/0",
                "/nodes/0/children/0": "/nodes/1",
                "/meshes/0/primitives/0/material": "/materials/0",
                "/meshes/0/primitives/2/material": "/materials/1",
                "/skins/1/joints/0": "/nodes/0",
                "/skins/1/joints/1": "/nodes/1",
                "/scenes/0/nodes/0": "/nodes/0",
                "/nodes/0/mesh": null,
                "/nodes/0/skin": null,
                "/nodes/0/parent": null,
                "/nodes/2/camera": null,
                "/nodes/2/mesh": null,
                "/nodes/2/skin": null,
                "/nodes/2/parent": null,
                "/nodes/1/children/0": null,
                "/nodes/0/children/1": null,
                "/meshes/0/primitives/1/material": null,
                "/meshes/0/primitives/4/material": null,
                "/skins/0/skeleton": null,
                "/skins/1/joints/2": null,
                "/skins/2/skeleton": null,
                "/scenes/0/nodes/2": null,
                "/scenes/2/nodes/0": null,
                "/nodes/3/camera": null,
                "/nodes/3/mesh": null,
                "/nodes/3/skin": null,
                "/nodes/3/parent": null,
                "/nodes/3/children/0": null,
                "/animations/0": null,
            };
            if (adapter !== "Babylon runtime metadata") {
                references["/skins/1/skeleton"] = "/nodes/0";
                references["/skins/0/joints/0"] = "/nodes/0";
                references["/meshes/0/primitives/3/material"] = "/materials/0";
                references["/scenes/1/nodes/0"] = "/nodes/2";
                references["/scenes/1/nodes/1"] = null;
                expect(engine.getPathValue("/scene")).toEqual([1]);
                expect(engine.getPathValue("/scenes.length")).toEqual([2]);
                expect(engine.getPathValue("/skins.length")).toEqual([2]);
                expect(engine.getPathValue("/skins/0/joints.length")).toEqual([1]);
                expect(engine.getPathValue("/meshes/0/primitives.length")).toEqual([4]);
            }
            expect(engine.getPathValue("/nodes/0/children.length")).toEqual([1]);
            expect(engine.getPathValue("/nodes/1/children.length")).toEqual([0]);
            const queries = Object.entries(references);
            for (const [path, value] of queries) {
                expect({ path, valid: engine.isValidJsonPtr(path), value: engine.getPathValue(path) })
                    .toEqual({ path, valid: value !== null, value: value === null ? undefined : [value] });
                if (value !== null) {
                    expect(engine.getPathTypeName(path)).toBe("ref");
                    expect(engine.isReadOnly(path)).toBe(true);
                }
            }
            engine.loadBehaveGraph({
                types: [{ signature: "ref" }, { signature: "bool" }],
                variables: queries.flatMap(() => [{ type: 0 }, { type: 1 }]),
                declarations: [{ op: "pointer/get" }, { op: "event/onStart" }, { op: "variable/set" }],
                nodes: [
                    ...queries.map(([path]) => ({ declaration: 0, configuration: { pointer: { value: [path] }, type: { value: [0] } } })),
                    { declaration: 1, flows: { out: { node: queries.length + 1, socket: "in" } } },
                    {
                        declaration: 2,
                        configuration: { variables: { value: queries.flatMap((_, index) => [index * 2, index * 2 + 1]) } },
                        values: Object.fromEntries(queries.flatMap((_, index) => [
                            [String(index * 2), { node: index, socket: "value" }],
                            [String(index * 2 + 1), { node: index, socket: "isValid" }],
                        ])),
                    },
                ],
            });
            queries.forEach(([path, value], index) => {
                expect({ path, value: engine.variables[index * 2].value, valid: engine.variables[index * 2 + 1].value })
                    .toEqual({ path, value: [value], valid: [value !== null] });
            });
            if (adapter !== "core") {
                engine.registerJsonPointer("/custom/ref", () => [null], () => undefined, "ref", true);
                expect(engine.isValidJsonPtr("/custom/ref")).toBe(true);
                expect(engine.getPathValue("/custom/ref")).toEqual([null]);
            }
        } finally {
            dispose();
        }
    });
});
