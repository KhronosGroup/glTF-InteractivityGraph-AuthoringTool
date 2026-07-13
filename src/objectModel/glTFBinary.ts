/* eslint-disable @typescript-eslint/no-explicit-any */
const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4e4f534a;

export function readGlbJsonFromArrayBuffer(buffer: ArrayBuffer): any {
    const view = new DataView(buffer);
    validateGlbHeader(view);

    let offset = 12;
    let json: any | undefined;
    const buffers: ArrayBuffer[] = [];
    while (offset < view.byteLength) {
        const chunkLength = view.getUint32(offset, true);
        const chunkType = view.getUint32(offset + 4, true);
        if (chunkType === JSON_CHUNK_TYPE) {
            const jsonBytes = new Uint8Array(buffer, offset + 8, chunkLength);
            json = JSON.parse(new TextDecoder().decode(jsonBytes).trim());
        } else if (chunkType === 0x004e4942) {
            const chunk = buffer.slice(offset + 8, offset + 8 + chunkLength);
            buffers.push(chunk);
        }
        offset += 8 + chunkLength;
    }

    if (json === undefined) {
        throw new Error("GLB file does not contain a JSON chunk");
    }

    Object.defineProperty(json, "__glbBuffers", {
        value: buffers,
        enumerable: false,
    });
    return json;
}

export function embedInteractivityGraphInGlb(buffer: ArrayBuffer, graph: any): ArrayBuffer {
    const source = new DataView(buffer);
    validateGlbHeader(source);

    const chunks: Array<{ type: number; data: Uint8Array }> = [];
    let jsonChunkIndex = -1;
    let offset = 12;
    while (offset < source.byteLength) {
        const chunkLength = source.getUint32(offset, true);
        const chunkType = source.getUint32(offset + 4, true);
        const chunkEnd = offset + 8 + chunkLength;
        if (chunkEnd > source.byteLength) {
            throw new Error("GLB contains a truncated chunk");
        }
        if (chunkType === JSON_CHUNK_TYPE && jsonChunkIndex === -1) {
            jsonChunkIndex = chunks.length;
        }
        chunks.push({ type: chunkType, data: new Uint8Array(buffer.slice(offset + 8, chunkEnd)) });
        offset = chunkEnd;
    }
    if (jsonChunkIndex === -1) {
        throw new Error("GLB file does not contain a JSON chunk");
    }

    const gltf = JSON.parse(new TextDecoder().decode(chunks[jsonChunkIndex].data).trim());
    gltf.extensions ??= {};
    gltf.extensions.KHR_interactivity = { graphs: [graph], graph: 0 };
    gltf.extensionsUsed ??= [];
    if (!gltf.extensionsUsed.includes("KHR_interactivity")) {
        gltf.extensionsUsed.push("KHR_interactivity");
    }

    const encodedJson = new TextEncoder().encode(JSON.stringify(gltf));
    const paddedJson = new Uint8Array((encodedJson.length + 3) & ~3);
    paddedJson.fill(0x20);
    paddedJson.set(encodedJson);
    chunks[jsonChunkIndex] = { type: JSON_CHUNK_TYPE, data: paddedJson };

    const outputLength = 12 + chunks.reduce((length, chunk) => length + 8 + chunk.data.byteLength, 0);
    const output = new ArrayBuffer(outputLength);
    const outputView = new DataView(output);
    outputView.setUint32(0, GLB_MAGIC, true);
    outputView.setUint32(4, GLB_VERSION, true);
    outputView.setUint32(8, outputLength, true);

    offset = 12;
    for (const chunk of chunks) {
        outputView.setUint32(offset, chunk.data.byteLength, true);
        outputView.setUint32(offset + 4, chunk.type, true);
        new Uint8Array(output, offset + 8, chunk.data.byteLength).set(chunk.data);
        offset += 8 + chunk.data.byteLength;
    }
    return output;
}

function validateGlbHeader(view: DataView): void {
    if (view.byteLength < 12 || view.getUint32(0, true) !== GLB_MAGIC) {
        throw new Error("File is not a GLB file");
    }
    if (view.getUint32(4, true) !== GLB_VERSION) {
        throw new Error("Only GLB version 2 is supported");
    }
    if (view.getUint32(8, true) !== view.byteLength) {
        throw new Error("GLB header length does not match the file length");
    }
}
