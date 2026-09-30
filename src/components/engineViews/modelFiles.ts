import { FilesInputStore } from "@babylonjs/core/Misc/filesInputStore";

export type ModelPluginExtension = ".glb" | ".gltf";

/** A selected or dropped file with its path relative to the selection (folder drops keep subfolders). */
export interface ModelFileEntry {
    path: string;
    file: File;
}

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

export const entriesFromFileList = (files: FileList | null | undefined): ModelFileEntry[] =>
    Array.from(files ?? []).map((file) => ({ path: file.webkitRelativePath || file.name, file }));

// FileSystemEntry API (drag and drop); readEntries returns batches until it yields an empty one
const readEntry = async (entry: FileSystemEntry, prefix: string, out: ModelFileEntry[]): Promise<void> => {
    if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
        out.push({ path: prefix + entry.name, file });
        return;
    }
    if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        for (;;) {
            const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
            if (batch.length === 0) { break; }
            for (const child of batch) {
                await readEntry(child, `${prefix}${entry.name}/`, out);
            }
        }
    }
};

/** Dropped files and folders (recursively), falling back to the flat file list. */
export const entriesFromDataTransfer = async (dataTransfer: DataTransfer): Promise<ModelFileEntry[]> => {
    const entries = Array.from(dataTransfer.items ?? [])
        .map((item) => (item.kind === "file" ? item.webkitGetAsEntry?.() : null))
        .filter((entry): entry is FileSystemEntry => entry != null);
    if (entries.length === 0) {
        return entriesFromFileList(dataTransfer.files);
    }
    const out: ModelFileEntry[] = [];
    for (const entry of entries) {
        await readEntry(entry, "", out);
    }
    return out;
};

/** The .glb/.gltf among the entries (the shallowest one); for a .gltf the others are its resources. */
export const findModelEntry = (entries: ModelFileEntry[]): ModelFileEntry | undefined =>
    entries
        .filter((entry) => MODEL_FILE.test(entry.path))
        .sort((a, b) => a.path.split("/").length - b.path.split("/").length)[0];

const directoryOf = (path: string) => path.slice(0, path.lastIndexOf("/") + 1);

const normalizePath = (path: string): string => {
    const segments: string[] = [];
    for (const segment of path.replace(/\\/g, "/").split("/")) {
        if (segment === "" || segment === ".") { continue; }
        if (segment === "..") { segments.pop(); continue; }
        segments.push(segment);
    }
    return segments.join("/");
};

/** Finds the entry a model uri points to: by path relative to the model, then by file name. */
export const resolveModelResource = (entries: ModelFileEntry[], model: ModelFileEntry, uri: string): File | undefined => {
    const decoded = decodeURIComponent(uri.split(/[?#]/)[0]);
    const wanted = normalizePath(directoryOf(model.path) + decoded).toLowerCase();
    const byPath = entries.find((entry) => normalizePath(entry.path).toLowerCase() === wanted);
    if (byPath) { return byPath.file; }
    const name = decoded.split("/").pop()?.toLowerCase();
    return entries.find((entry) => entry.file.name.toLowerCase() === name)?.file;
};

/**
 * Babylon resolves a "file:"-rooted model's uris as FilesInputStore keys (lowercase uri), so
 * register every entry under its path relative to the model, plus its bare name as a fallback.
 */
export const registerModelFiles = (entries: ModelFileEntry[], model: ModelFileEntry): void => {
    FilesInputStore.FilesToLoad = {};
    const modelDirectory = directoryOf(model.path).toLowerCase();
    for (const entry of entries) {
        const path = entry.path.toLowerCase();
        FilesInputStore.FilesToLoad[entry.file.name.toLowerCase()] ??= entry.file;
        if (path.startsWith(modelDirectory)) {
            FilesInputStore.FilesToLoad[path.slice(modelDirectory.length)] = entry.file;
        }
    }
};
