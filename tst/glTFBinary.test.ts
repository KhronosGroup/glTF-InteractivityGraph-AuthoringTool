import { embedInteractivityGraphInGlb, readGlbJsonFromArrayBuffer } from "../src/objectModel/glTFBinary";
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util";

Object.defineProperties(globalThis, {
    TextDecoder: { configurable: true, value: NodeTextDecoder },
    TextEncoder: { configurable: true, value: NodeTextEncoder },
});

describe("glTF binary helpers", () => {
    it("embeds the authored graph and preserves binary chunks", () => {
        const binaryChunk = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const input = createGlb({ asset: { version: "2.0" }, buffers: [{ byteLength: binaryChunk.length }] }, binaryChunk);
        const graph = {
            declarations: [],
            nodes: [],
            events: [],
            variables: [],
            types: [],
        };

        const output = embedInteractivityGraphInGlb(input, graph);
        const gltf = readGlbJsonFromArrayBuffer(output);

        expect(gltf.extensions.KHR_interactivity).toEqual({ graphs: [graph], graph: 0 });
        expect(gltf.extensionsUsed).toEqual(["KHR_interactivity"]);
        expect(new Uint8Array(gltf.__glbBuffers[0])).toEqual(binaryChunk);
        expect(new DataView(output).getUint32(8, true)).toBe(output.byteLength);
    });

    it("does not duplicate an existing extension declaration", () => {
        const input = createGlb({
            asset: { version: "2.0" },
            extensionsUsed: ["KHR_interactivity"],
        });

        const output = embedInteractivityGraphInGlb(input, { nodes: [] });
        expect(readGlbJsonFromArrayBuffer(output).extensionsUsed).toEqual(["KHR_interactivity"]);
    });
});

function createGlb(gltf: unknown, binaryChunk?: Uint8Array): ArrayBuffer {
    const encodedJson = new TextEncoder().encode(JSON.stringify(gltf));
    const json = new Uint8Array((encodedJson.length + 3) & ~3);
    json.fill(0x20);
    json.set(encodedJson);
    const totalLength = 12 + 8 + json.length + (binaryChunk ? 8 + binaryChunk.length : 0);
    const output = new ArrayBuffer(totalLength);
    const view = new DataView(output);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, totalLength, true);
    view.setUint32(12, json.length, true);
    view.setUint32(16, 0x4e4f534a, true);
    new Uint8Array(output, 20, json.length).set(json);
    if (binaryChunk) {
        const offset = 20 + json.length;
        view.setUint32(offset, binaryChunk.length, true);
        view.setUint32(offset + 4, 0x004e4942, true);
        new Uint8Array(output, offset + 8, binaryChunk.length).set(binaryChunk);
    }
    return output;
}
