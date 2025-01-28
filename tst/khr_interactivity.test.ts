import {Scene} from "@babylonjs/core/scene";
import {GLTFLoader, IGLTF, INode} from "@babylonjs/loaders/glTF/2.0";
import {NullEngine, TransformNode} from "@babylonjs/core";
import {IScene} from "@babylonjs/loaders/glTF/2.0/glTFLoaderInterfaces";
import {KHR_interactivity} from "../src/loaderExtensions/KHR_interactivity";
import {GLTFFileLoader} from "@babylonjs/loaders";

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
        const loadScene: IScene = {
            index: 0,
            nodes: [],
        };
        await khrInteractivity.loadSceneAsync('test', loadScene);
        expect(scene.extras.behaveGraph).not.toBeUndefined();
        const behavior = scene.extras.behaveGraph;
        expect(behavior.nodes.length).toBe(1);
        expect(behavior.events.length).toBe(0);
        expect(behavior.variables.length).toBe(0);
    });
});
