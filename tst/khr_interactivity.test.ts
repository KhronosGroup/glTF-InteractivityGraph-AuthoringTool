import {Scene} from "@babylonjs/core/scene";
import {GLTFLoader, IGLTF, INode} from "@babylonjs/loaders/glTF/2.0";
import {NullEngine, PBRMaterial, TransformNode} from "@babylonjs/core";
import {IScene} from "@babylonjs/loaders/glTF/2.0/glTFLoaderInterfaces";
import {KHR_interactivity} from "../src/loaderExtensions/KHR_interactivity";
import {GLTFFileLoader} from "@babylonjs/loaders";
import {jest} from "@jest/globals";

const engine = new NullEngine();
const scene: any = new Scene(engine);

class MockLoader extends GLTFLoader {
    get gltf(): IGLTF {
        return { asset: { version: '1' }, nodes: [{ index: 0 }, { index: 1 }, { index: 2 }] };
    }

    isExtensionUsed = (name: string): boolean => {
        return true;
    };
    loadNodeAsync = (
        context: string,
        node: INode,
        assign?: (babylonTransformNode: TransformNode) => void,
    ): Promise<TransformNode> => {
        return new Promise((resolve) => {
            const transformNode: TransformNode = new TransformNode('test', scene);
            transformNode.metadata = {};
            resolve(transformNode);
        });
    };
    loadSceneAsync = (context: string, scene: IScene): Promise<void> => {
        return new Promise((resolve) => {
            resolve();
        });
    };
}

class MockBehaviorLoader extends MockLoader {
    get gltf(): IGLTF {
        return {
            asset: { version: '1' },
            extensions: {
                KHR_interactivity: {
                    graphs: [
                        {
                            declarations: [
                                {
                                    op: "event/onStart"
                                }
                            ],
                            nodes: [
                                {
                                    declaration: 0,
                                    values: {},
                                    configuration: {},
                                    flows: {
                                        out: {}
                                    },
                                }
                            ],
                            variables: [],
                            events: [],
                            types: []
                        }
                    ],
                    graph: 0
                },
            },
        };
    }
    get babylonScene(): Scene {
        return scene;
    }
}

describe('Extensions', () => {
    let khrInteractivity: KHR_interactivity;

    beforeAll(() => {
        khrInteractivity = new KHR_interactivity(new MockBehaviorLoader(new GLTFFileLoader()));
    });


    it('should add behaviors to scene extras', async () => {
        khrInteractivity.onLoading();
        expect(scene.metadata.behaveGraph).not.toBeUndefined();
        const behavior = scene.metadata.behaveGraph;
        expect(behavior.nodes.length).toBe(1);
        expect(behavior.events.length).toBe(0);
        expect(behavior.variables.length).toBe(0);
    });

    it('loads addressable subsurface textures even when their factors use zero defaults', async () => {
        const loadTextureInfoAsync = jest.fn(async (_context: string, _info: unknown, assign: (texture: any) => void) => {
            const texture = {};
            assign(texture);
            return texture;
        });
        const loader = {
            loadMaterialPropertiesAsync: jest.fn(async () => undefined),
            loadTextureInfoAsync,
        } as unknown as GLTFLoader;
        const extension = new KHR_interactivity(loader);
        const material = new PBRMaterial('subsurface', scene);
        material.subSurface.refractionIntensity = 0;
        material.subSurface.maximumThickness = 0;

        await extension.loadMaterialPropertiesAsync('/materials/0', {
            extensions: {
                KHR_materials_transmission: { transmissionTexture: { index: 0 } },
                KHR_materials_volume: { thicknessTexture: { index: 1 } },
            },
        }, material);

        expect(loadTextureInfoAsync).toHaveBeenCalledTimes(2);
        expect(material.subSurface.refractionIntensityTexture).not.toBeNull();
        expect(material.subSurface.thicknessTexture).not.toBeNull();
        expect(material.subSurface.refractionIntensity).toBe(0);
        expect(material.subSurface.maximumThickness).toBe(0);
    });
});
