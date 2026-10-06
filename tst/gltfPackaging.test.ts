import { isGlb, readGlbJsonFromArrayBuffer, writeGlb } from "../src/objectModel/glTFBinary";
import { packageAsGlb, packageAsGltfFiles } from "../src/objectModel/gltfPackaging";
import { crc32, createZip } from "../src/utils/zip";
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util";

Object.defineProperties(globalThis, {
    TextDecoder: { configurable: true, value: NodeTextDecoder },
    TextEncoder: { configurable: true, value: NodeTextEncoder },
});

const graph = { nodes: [] };
const bytes = (...values: number[]) => new Uint8Array(values);
const toArrayBuffer = (data: Uint8Array) => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
const gltfFile = (gltf: unknown) => toArrayBuffer(new TextEncoder().encode(JSON.stringify(gltf)));

describe("glTF packaging", () => {
    const externalFiles: Record<string, Uint8Array> = {
        "model.bin": bytes(1, 2, 3, 4, 5, 6),
        "textures/wood grain.png": bytes(9, 9, 9),
    };
    const resolve = async (uri: string) => {
        const data = externalFiles[decodeURIComponent(uri)];
        if (!data) { throw new Error(`missing ${uri}`); }
        return data;
    };
    const source = gltfFile({
        asset: { version: "2.0" },
        buffers: [{ uri: "model.bin", byteLength: 6 }, { uri: "data:application/octet-stream;base64,BwgJ", byteLength: 3 }],
        bufferViews: [{ buffer: 0, byteOffset: 2, byteLength: 4 }, { buffer: 1, byteLength: 3 }],
        images: [{ uri: "textures/wood%20grain.png" }],
    });

    it("packs external and data-uri buffers and images into a single GLB", async () => {
        const glb = await packageAsGlb(source, graph, resolve);
        expect(isGlb(glb)).toBe(true);
        const gltf = readGlbJsonFromArrayBuffer(glb);
        const bin = new Uint8Array(gltf.__glbBuffers[0]);
        const view = (index: number) => {
            const bufferView = gltf.bufferViews[index];
            return bin.subarray(bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength);
        };

        expect(gltf.buffers).toEqual([{ byteLength: bin.byteLength }]);
        expect(gltf.bufferViews.every((bufferView: any) => bufferView.buffer === 0)).toBe(true);
        expect(view(0)).toEqual(bytes(3, 4, 5, 6));
        expect(view(1)).toEqual(bytes(7, 8, 9));
        expect(gltf.images[0]).toEqual({ bufferView: 2, mimeType: "image/png" });
        expect(view(2)).toEqual(bytes(9, 9, 9));
        expect(gltf.extensions.KHR_interactivity).toEqual({ graphs: [graph], graph: 0 });
    });

    it("writes a .gltf with its referenced files, keeping data uris inline", async () => {
        const files = await packageAsGltfFiles(source, graph, resolve, "model.interactive");
        expect(files.map((file) => file.path)).toEqual(["model.interactive.gltf", "model.bin", "textures/wood grain.png"]);
        const gltf = JSON.parse(new TextDecoder().decode(files[0].data));
        expect(gltf.buffers.map((buffer: any) => buffer.uri)).toEqual(["model.bin", "data:application/octet-stream;base64,BwgJ"]);
        expect(gltf.images[0].uri).toBe("textures/wood%20grain.png");
        expect(gltf.extensions.KHR_interactivity).toEqual({ graphs: [graph], graph: 0 });
    });

    it("turns a GLB's BIN chunk into a .bin file for the .gltf", async () => {
        const glb = writeGlb({ asset: { version: "2.0" }, buffers: [{ byteLength: 4 }] }, bytes(1, 2, 3, 4));
        const files = await packageAsGltfFiles(glb, graph, resolve, "scene");
        expect(files.map((file) => file.path)).toEqual(["scene.gltf", "scene.bin"]);
        expect(files[1].data).toEqual(bytes(1, 2, 3, 4));
        expect(JSON.parse(new TextDecoder().decode(files[0].data)).buffers[0].uri).toBe("scene.bin");
    });
});

describe("zip writer", () => {
    it("computes the standard CRC-32", () => {
        expect(crc32(new TextEncoder().encode("hello"))).toBe(0x3610a686);
    });

    it("stores entries with a matching central directory", () => {
        const zip = createZip([{ path: "a.gltf", data: bytes(1, 2) }, { path: "textures/b.png", data: bytes(3) }]);
        const view = new DataView(zip.buffer);
        const end = zip.byteLength - 22;
        expect(view.getUint32(0, true)).toBe(0x04034b50);
        expect(view.getUint32(end, true)).toBe(0x06054b50);
        expect(view.getUint16(end + 10, true)).toBe(2);
        const centralOffset = view.getUint32(end + 16, true);
        expect(view.getUint32(centralOffset, true)).toBe(0x02014b50);
    });
});
