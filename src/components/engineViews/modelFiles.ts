import { FilesInputStore } from "@babylonjs/core/Misc/filesInputStore";

export type ModelPluginExtension = ".glb" | ".gltf";

const MODEL_FILE = /\.(glb|gltf)$/i;

/** Babylon cannot sniff the format of a blob/extensionless source, so it is picked from the name. */
export const pluginExtensionForName = (name: string): ModelPluginExtension => /\.gltf$/i.test(name) ? ".gltf" : ".glb";

export const pluginExtensionForUrl = (url: string): ModelPluginExtension => {
    try {
        return pluginExtensionForName(new URL(url, window.location.href).pathname);
    } catch {
        return ".glb";
    }
};

/** The .glb/.gltf among the selected files; for a .gltf the others are its .bin and textures. */
export const findModelFile = (files: FileList | null | undefined): File | undefined =>
    Array.from(files ?? []).find((file) => MODEL_FILE.test(file.name));

/** Babylon resolves a "file:"-rooted model's relative uris (by lowercase name) from this store. */
export const registerModelFiles = (files: FileList | null | undefined): void => {
    FilesInputStore.FilesToLoad = {};
    for (const file of Array.from(files ?? [])) {
        FilesInputStore.FilesToLoad[file.name.toLowerCase()] = file;
    }
};
