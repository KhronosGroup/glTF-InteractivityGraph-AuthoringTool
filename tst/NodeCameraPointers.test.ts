import { FreeCamera, NullEngine, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { BasicBehaveEngine } from "../src/BasicBehaveEngine/BasicBehaveEngine";
import { DOMEventBus } from "../src/BasicBehaveEngine/eventBuses/DOMEventBus";
import type { IInteractivityValue } from "../src/BasicBehaveEngine/types/InteractivityGraph";
import { BabylonDecorator } from "../src/decorators/BabylonDecorator";
import { createGlTFObjectModelFromGltf, GlTFObjectModelDecorator } from "../src/objectModel/glTFObjectModel";
import { glTFSchemaMetadata } from "../src/objectModel/generated/glTFSchemaMetadata";

describe("node camera reference contract", () => {
    const gltf = {
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [0, 1, 2] }],
        nodes: [{ camera: 1 }, {}, { camera: 0 }],
        cameras: [1, 0.5].map(yfov => ({ type: "perspective", perspective: { yfov, znear: 0.1 } })),
    };

    it("advertises ref for both authoring address modes", () => {
        for (const template of ["/nodes/[]/camera", "/nodes/{}/camera"]) {
            expect(glTFSchemaMetadata.objectModelPointers.find(pointer => pointer.template === template))
                .toMatchObject({ typeName: "ref", readOnly: true });
        }
    });

    it.each(["core", "Babylon source metadata", "Babylon camera metadata"])(
        "%s traverses camera references and rejects missing cameras or int-typed reads",
        (adapter) => {
            const engine = new BasicBehaveEngine(60, new DOMEventBus());
            let dispose: () => void;
            if (adapter === "core") {
                const decorator = new GlTFObjectModelDecorator(engine, createGlTFObjectModelFromGltf(gltf));
                dispose = () => decorator.dispose();
            } else {
                const renderer = new NullEngine();
                const scene = new Scene(renderer);
                const nodes = gltf.nodes.map((_, index) => new TransformNode(`node-${index}`, scene));
                scene.metadata = { gltfCameraDefinitions: gltf.cameras };
                if (adapter === "Babylon source metadata") {
                    scene.metadata.gltfStructure = gltf;
                }
                for (const [nodeIndex, cameraIndex] of [[0, 1], [2, 0]]) {
                    const camera = new FreeCamera(`camera-${cameraIndex}`, Vector3.Zero(), scene);
                    camera.parent = nodes[nodeIndex];
                    camera.fov = gltf.cameras[cameraIndex].perspective.yfov;
                    Object.assign(camera, { _internalMetadata: { gltf: { pointers: [`/cameras/${cameraIndex}`] } } });
                }
                const decorator = new BabylonDecorator(engine, { glTFNodes: nodes, materials: [], meshes: [], animations: [] }, scene);
                dispose = () => { decorator.dispose(); scene.dispose(); renderer.dispose(); };
            }

            try {
                for (const [nodeIndex, cameraIndex] of [[0, 1], [2, 0]]) {
                    const pointer = `/nodes/${nodeIndex}/camera`;
                    expect(engine.getPathTypeName(pointer)).toBe("ref");
                    expect(engine.getPathValue(pointer)).toEqual([`/cameras/${cameraIndex}`]);
                    expect(engine.isReadOnly(pointer)).toBe(true);
                    engine.setPathValue(pointer, ["/cameras/42"]);
                    expect(engine.getPathValue(pointer)).toEqual([`/cameras/${cameraIndex}`]);
                }
                expect(engine.isValidJsonPtr("/nodes/1/camera")).toBe(false);
                expect(engine.isValidJsonPtr("/nodes/3/camera")).toBe(false);

                const queries: Array<{ path: string; type: number; value: (string | number | null)[]; valid: boolean; inputs?: Record<string, IInteractivityValue> }> = [
                    { path: "/nodes/0/camera", type: 1, value: ["/cameras/1"], valid: true },
                    { path: "/nodes/2/camera", type: 1, value: ["/cameras/0"], valid: true },
                    { path: "/nodes/0/camera", type: 0, value: [0], valid: false },
                    { path: "/nodes/1/camera", type: 0, value: [0], valid: false },
                    { path: "/nodes/1/camera", type: 1, value: [null], valid: false },
                    { path: "/nodes/[node]/camera", type: 1, value: ["/cameras/1"], valid: true, inputs: { node: { type: 0, value: [0] } } },
                    { path: "/nodes/{node}/camera", type: 1, value: ["/cameras/0"], valid: true, inputs: { node: { type: 1, value: ["/nodes/2"] } } },
                    { path: "/cameras/{camera}/perspective/yfov", type: 3, value: [0.5], valid: true, inputs: { camera: { node: 5, socket: "value" } } },
                    { path: "/cameras/{camera}/perspective/yfov", type: 3, value: [1], valid: true, inputs: { camera: { node: 6, socket: "value" } } },
                ];
                engine.loadBehaveGraph({
                    types: [{ signature: "int" }, { signature: "ref" }, { signature: "bool" }, { signature: "float" }],
                    variables: queries.flatMap(query => [{ type: query.type }, { type: 2 }]),
                    declarations: [{ op: "pointer/get" }, { op: "event/onStart" }, { op: "variable/set" }],
                    nodes: [
                        ...queries.map(query => ({
                            declaration: 0,
                            configuration: { pointer: { value: [query.path] }, type: { value: [query.type] } },
                            ...(query.inputs ? { values: query.inputs } : {}),
                        })),
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
                queries.forEach((query, index) => {
                    expect(engine.variables[index * 2].value).toEqual(query.value);
                    expect(engine.variables[index * 2 + 1].value).toEqual([query.valid]);
                });
            } finally {
                dispose();
            }
        },
    );
});
