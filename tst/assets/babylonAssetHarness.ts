import fs from "fs";
import path from "path";
import { NullEngine, Scene as BabylonScene, SceneLoader } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { GLTFFileLoader, GLTFLoaderAnimationStartMode } from "@babylonjs/loaders";
import { GLTFLoader } from "@babylonjs/loaders/glTF/2.0";
import { buildBabylonDecoratorWorld, buildBabylonLoadedModel } from "../../src/components/engineViews/babylonLoadedModel";
import { KHR_interactivity, KHR_INTERACTIVITY_EXTENSION_NAME } from "../../src/loaderExtensions/KHR_interactivity";

export { NullEngine, BabylonScene };

let loaderConfigured = false;

export async function loadBabylonWorldFromGlb(glbPath: string, scene: BabylonScene): Promise<any> {
    configureBabylonLoader();

    const container = await SceneLoader.LoadAssetContainerAsync("", createGlbDataUrl(glbPath), scene, undefined, ".glb", path.basename(glbPath));
    container.addAllToScene();

    return buildBabylonDecoratorWorld(buildBabylonLoadedModel(container));
}

function configureBabylonLoader(): void {
    if (!loaderConfigured) {
        GLTFLoader.RegisterExtension(KHR_INTERACTIVITY_EXTENSION_NAME, (loader) => new KHR_interactivity(loader));
        SceneLoader.OnPluginActivatedObservable.add((loader) => {
            if (loader.name === "gltf") {
                (loader as GLTFFileLoader).animationStartMode = GLTFLoaderAnimationStartMode.NONE;
            }
        });
        loaderConfigured = true;
    }
}

function createGlbDataUrl(glbPath: string): string {
    return `data:model/gltf-binary;base64,${fs.readFileSync(path.resolve(glbPath)).toString("base64")}`;
}
