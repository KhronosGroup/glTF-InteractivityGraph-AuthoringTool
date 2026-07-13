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

    it("exposes exact animation object refs without normalizing object model paths", () => {
        const decorator = createDecorator({
            animations: [{ channels: [], samplers: [] }],
        });

        expect(decorator.isValidJsonPtr("/animations/0/")).toBe(true);
        expect(decorator.getPathtypeName("/animations/0/")).toBe("ref");
        expect(decorator.getPathValue("/animations/0/")).toEqual(["/animations/0/"]);
        expect(decorator.isValidJsonPtr("/animations/0")).toBe(false);
    });

    it("registers draft node extension pointers from generated schema metadata", () => {
        const decorator = createDecorator({
            nodes: [{
                extensions: {
                    KHR_node_selectability: {},
                    KHR_node_hoverability: { hoverable: false },
                },
            }],
        });

        expect(decorator.getPathValue("/nodes/0/extensions/KHR_node_selectability/selectable")).toEqual([true]);
        expect(decorator.getPathValue("/nodes/0/extensions/KHR_node_hoverability/hoverable")).toEqual([false]);

        decorator.setPathValue("/nodes/0/extensions/KHR_node_selectability/selectable", [false]);
        expect(decorator.getPathValue("/nodes/0/extensions/KHR_node_selectability/selectable")).toEqual([false]);
    });

    it("registers material pointers from ratified material schemas", () => {
        const decorator = createDecorator({
            materials: [{
                extensions: {
                    KHR_materials_dispersion: {},
                    KHR_materials_clearcoat: {
                        clearcoatNormalTexture: { index: 0 },
                    },
                },
            }],
        });

        expect(decorator.getPathValue("/materials/0/extensions/KHR_materials_dispersion/dispersion")).toEqual([0]);
        expect(decorator.getPathValue("/materials/0/extensions/KHR_materials_clearcoat/clearcoatNormalTexture/scale")).toEqual([1]);
        expect(decorator.isValidJsonPtr("/materials/0/extensions/KHR_materials_clearcoat/clearcoatTexture/texCoord")).toBe(false);

        decorator.setPathValue("/materials/0/extensions/KHR_materials_dispersion/dispersion", [0.25]);
        expect(decorator.getPathValue("/materials/0/extensions/KHR_materials_dispersion/dispersion")).toEqual([0.25]);
    });
});

function createDecorator(gltf: any): GlTFObjectModelDecorator {
    return new GlTFObjectModelDecorator(
        new BasicBehaveEngine(60, new DOMEventBus()),
        createGlTFObjectModelFromGltf(gltf)
    );
}
