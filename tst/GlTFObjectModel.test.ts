import { BasicBehaveEngine } from "../src/BasicBehaveEngine/BasicBehaveEngine";
import { DOMEventBus } from "../src/BasicBehaveEngine/eventBuses/DOMEventBus";
import { createGlTFObjectModelFromGltf, GlTFObjectModelDecorator } from "../src/objectModel/glTFObjectModel";

describe("GlTFObjectModelDecorator", () => {
    it("resolves only concrete object-model references exposed by the loaded glTF", () => {
        const decorator = createDecorator({
            scene: 0,
            scenes: [{ nodes: [0] }],
            cameras: [{ perspective: { yfov: 1, znear: 0.1 } }],
            nodes: [
                {},
                { camera: 0, children: [2] },
                { mesh: 0 },
            ],
            meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        });

        expect(decorator.isValidJsonPtr("/nodes/0/camera")).toBe(false);
        expect(decorator.isValidJsonPtr("/nodes/1/camera")).toBe(true);
        expect(decorator.getPathtypeName("/nodes/1/camera")).toBe("ref");
        expect(decorator.getPathValue("/nodes/1/camera")).toEqual(["/cameras/0/"]);

        expect(decorator.isValidJsonPtr("/nodes/0/children/0")).toBe(false);
        expect(decorator.isValidJsonPtr("/nodes/1/children/0")).toBe(true);
        expect(decorator.getPathValue("/nodes/1/children/0")).toEqual(["/nodes/2/"]);
    });

    it("uses schema-derived defaults for defaulted glTF properties", () => {
        const decorator = createDecorator({
            materials: [{}],
            nodes: [],
        });

        expect(decorator.getPathValue("/materials/0/alphaCutoff")).toEqual([0.5]);
        decorator.setPathValue("/materials/0/alphaCutoff", [0.25]);
        expect(decorator.getPathValue("/materials/0/alphaCutoff")).toEqual([0.25]);
    });
});

function createDecorator(gltf: any): GlTFObjectModelDecorator {
    return new GlTFObjectModelDecorator(
        new BasicBehaveEngine(60, new DOMEventBus()),
        createGlTFObjectModelFromGltf(gltf)
    );
}
