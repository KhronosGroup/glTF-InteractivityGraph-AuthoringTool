/* eslint-disable @typescript-eslint/no-explicit-any */
import { isGlb, readGlbJsonFromArrayBuffer, setInteractivityGraph, writeGlb } from "./glTFBinary";

/** Loads a resource referenced by a (non-data) uri of the source model. */
export type ResourceResolver = (uri: string) => Promise<Uint8Array>;

export interface PackagedFile {
    path: string;
    data: Uint8Array;
}

const DATA_URI = /^data:([^,]*?)(;base64)?,(.*)$/s;
// any scheme other than data: (http:, https:, file:, ...) is kept as an external reference
const ABSOLUTE_URI = /^[a-z][a-z0-9+.-]*:/i;

const align4 = (length: number) => (length + 3) & ~3;

const decodeDataUri = (uri: string): Uint8Array | undefined => {
    const match = DATA_URI.exec(uri);
    if (!match) { return undefined; }
    if (!match[2]) { return new TextEncoder().encode(decodeURIComponent(match[3])); }
    const binary = atob(match[3]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
    return bytes;
};

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", ktx2: "image/ktx2",
};

const imageMimeType = (uri: string): string | undefined => {
    const dataMime = DATA_URI.exec(uri)?.[1];
    if (dataMime) { return dataMime; }
    return IMAGE_MIME_BY_EXTENSION[uri.split(/[?#]/)[0].split(".").pop()?.toLowerCase() ?? ""];
};

const loadUri = async (uri: string, resolve: ResourceResolver): Promise<Uint8Array> => decodeDataUri(uri) ?? resolve(uri);

/** The JSON of a .glb/.gltf plus, for a .glb, its BIN chunk (the data of the uri-less first buffer). */
const readModel = (bytes: ArrayBuffer): { gltf: any; bin?: Uint8Array } => {
    if (!isGlb(bytes)) {
        return { gltf: JSON.parse(new TextDecoder().decode(bytes)) };
    }
    const gltf = readGlbJsonFromArrayBuffer(bytes);
    const binChunk: ArrayBuffer | undefined = gltf.__glbBuffers?.[0];
    return { gltf, bin: binChunk ? new Uint8Array(binChunk) : undefined };
};

/**
 * A single .glb holding the graph and every buffer and image of the source: external/data-uri
 * buffers are concatenated into the BIN chunk and uri images become bufferView images. Without a
 * graph the source's own KHR_interactivity extension is kept as is.
 */
export async function packageAsGlb(source: ArrayBuffer, graph: any | undefined, resolve: ResourceResolver): Promise<ArrayBuffer> {
    const { gltf, bin } = readModel(source);
    const parts: { offset: number; data: Uint8Array }[] = [];
    let length = 0;
    const append = (data: Uint8Array): number => {
        const offset = length;
        parts.push({ offset, data });
        length = align4(offset + data.byteLength);
        return offset;
    };

    const buffers: any[] = gltf.buffers ?? [];
    const bufferOffsets: number[] = [];
    for (let i = 0; i < buffers.length; i++) {
        const buffer = buffers[i];
        let data: Uint8Array;
        if (buffer.uri !== undefined) {
            data = await loadUri(buffer.uri, resolve);
        } else if (i === 0 && bin !== undefined) {
            data = bin;
        } else {
            throw new Error(`Buffer ${i} has no uri and no GLB data`);
        }
        bufferOffsets[i] = append(data.subarray(0, buffer.byteLength));
    }
    for (const bufferView of gltf.bufferViews ?? []) {
        bufferView.byteOffset = (bufferView.byteOffset ?? 0) + bufferOffsets[bufferView.buffer];
        bufferView.buffer = 0;
    }
    for (const image of gltf.images ?? []) {
        if (image.uri === undefined || (ABSOLUTE_URI.test(image.uri) && !image.uri.startsWith("data:"))) { continue; }
        const data = await loadUri(image.uri, resolve);
        gltf.bufferViews ??= [];
        gltf.bufferViews.push({ buffer: 0, byteOffset: append(data), byteLength: data.byteLength });
        image.bufferView = gltf.bufferViews.length - 1;
        image.mimeType ??= imageMimeType(image.uri);
        delete image.uri;
    }

    const packed = new Uint8Array(length);
    for (const part of parts) { packed.set(part.data, part.offset); }
    if (length > 0) {
        gltf.buffers = [{ byteLength: length }];
    } else {
        delete gltf.buffers;
    }
    if (graph !== undefined) {
        setInteractivityGraph(gltf, graph);
    }
    return writeGlb(gltf, packed);
}

// a relative path that stays inside the output folder
const safeRelativePath = (uri: string): string => {
    const segments: string[] = [];
    for (const segment of decodeURIComponent(uri.split(/[?#]/)[0]).replace(/\\/g, "/").split("/")) {
        if (segment === "" || segment === "." || segment === "..") { continue; }
        segments.push(segment);
    }
    return segments.join("/");
};

/**
 * A .gltf holding the graph plus the files it references: a .glb's BIN chunk becomes
 * `<baseName>.bin`, external buffers/images are copied under their relative paths. Images stored
 * in bufferViews stay in the .bin, which is valid glTF.
 */
export async function packageAsGltfFiles(source: ArrayBuffer, graph: any, resolve: ResourceResolver, baseName: string): Promise<PackagedFile[]> {
    const { gltf, bin } = readModel(source);
    const files: PackagedFile[] = [];
    const paths = new Set<string>();
    const addReferencedFile = async (holder: { uri?: string }) => {
        const uri = holder.uri;
        if (uri === undefined || ABSOLUTE_URI.test(uri)) { return; }
        const path = safeRelativePath(uri);
        if (!paths.has(path)) {
            files.push({ path, data: await resolve(uri) });
            paths.add(path);
        }
        holder.uri = encodeURI(path);
    };

    const buffers: any[] = gltf.buffers ?? [];
    for (let i = 0; i < buffers.length; i++) {
        if (buffers[i].uri === undefined && i === 0 && bin !== undefined) {
            const path = `${baseName}.bin`;
            files.push({ path, data: bin.subarray(0, buffers[i].byteLength) });
            paths.add(path);
            buffers[i].uri = encodeURI(path);
        } else {
            await addReferencedFile(buffers[i]);
        }
    }
    for (const image of gltf.images ?? []) {
        await addReferencedFile(image);
    }

    setInteractivityGraph(gltf, graph);
    files.unshift({ path: `${baseName}.gltf`, data: new TextEncoder().encode(JSON.stringify(gltf, null, 2)) });
    return files;
}
