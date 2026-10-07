import fs from "fs";
import path from "path";
import { AssetContainer, NullEngine, Scene as BabylonScene } from "@babylonjs/core";
import { buildBabylonDecoratorWorld, buildBabylonLoadedModel } from "../../src/components/engineViews/babylonLoadedModel";
import { GltfContainerLoadOptions, loadGltfAssetContainer } from "../../src/components/engineViews/babylonLoader";

export { NullEngine, BabylonScene };

export async function loadBabylonWorldFromGlb(glbPath: string, scene: BabylonScene): Promise<any> {
    return buildBabylonDecoratorWorld(buildBabylonLoadedModel(await loadGlbIntoScene(glbPath, scene)));
}

/** Loads a glb for Babylon's own KHR_interactivity runtime; its graph is built but not started. */
export async function loadGlbForNativeInteractivity(glbPath: string, scene: BabylonScene): Promise<void> {
    await loadGlbIntoScene(glbPath, scene, { nativeInteractivity: true });
}

async function loadGlbIntoScene(glbPath: string, scene: BabylonScene, options: Partial<GltfContainerLoadOptions> = {}): Promise<AssetContainer> {
    const container = await loadGltfAssetContainer(createGlbDataUrl(glbPath), scene, { ...options, pluginExtension: ".glb", name: path.basename(glbPath) });
    container.addAllToScene();

    // Mirrors the Babylon views' setup: scene.render() throws "No camera defined" otherwise,
    // and assets under test don't necessarily author their own camera.
    if (!scene.activeCamera) {
        scene.createDefaultCamera(true, true, true);
    }
    return container;
}

/**
 * Babylon 9 loads shader code with lazy import()s while materials compile. Wait for them before
 * disposing, otherwise one resolving after the Jest environment is torn down crashes the run.
 */
export async function disposeBabylonScene(scene: BabylonScene, engine: NullEngine): Promise<void> {
    await Promise.race([
        scene.whenReadyAsync().catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    scene.dispose();
    engine.dispose();
}

function createGlbDataUrl(glbPath: string): string {
    return `data:model/gltf-binary;base64,${fs.readFileSync(path.resolve(glbPath)).toString("base64")}`;
}
