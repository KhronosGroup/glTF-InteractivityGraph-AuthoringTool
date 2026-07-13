/* eslint-disable @typescript-eslint/no-explicit-any */
export function readGlbJsonFromArrayBuffer(buffer: ArrayBuffer): any {
    const view = new DataView(buffer);
    if (view.getUint32(0, true) !== 0x46546c67) {
        throw new Error("File is not a GLB file");
    }

    let offset = 12;
    let json: any | undefined;
    const buffers: ArrayBuffer[] = [];
    while (offset < view.byteLength) {
        const chunkLength = view.getUint32(offset, true);
        const chunkType = view.getUint32(offset + 4, true);
        if (chunkType === 0x4e4f534a) {
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
