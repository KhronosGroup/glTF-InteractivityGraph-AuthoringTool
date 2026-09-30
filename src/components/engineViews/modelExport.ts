import { IInteractivityGraph, IInteractivityValue } from "../../BasicBehaveEngine/types/InteractivityGraph";
import { packageAsGlb, packageAsGltfFiles, ResourceResolver } from "../../objectModel/gltfPackaging";
import { createZip } from "../../utils/zip";
import { ModelFileEntry, resolveModelResource } from "./modelFiles";

/** The model the viewport is currently showing: local files (a .gltf with its resources) or a URL. */
export type ModelSource =
    | { kind: "files"; model: ModelFileEntry; entries: ModelFileEntry[] }
    | { kind: "url"; url: string };

export type ModelExportFormat = "glb" | "gltf-zip";

const fetchBytes = async (url: string): Promise<Uint8Array> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url} (${response.status} ${response.statusText})`);
    }
    return new Uint8Array(await response.arrayBuffer());
};

const readSource = async (source: ModelSource): Promise<ArrayBuffer> => {
    if (source.kind === "files") {
        return source.model.file.arrayBuffer();
    }
    const bytes = await fetchBytes(source.url);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

// external .bin/textures come from the other selected files, or relative to the model URL
const resourceResolverFor = (source: ModelSource): ResourceResolver => async (uri) => {
    if (source.kind === "url") {
        return fetchBytes(new URL(uri, new URL(source.url, window.location.href)).href);
    }
    const file = resolveModelResource(source.entries, source.model, uri);
    if (file === undefined) {
        throw new Error(`"${decodeURIComponent(uri)}" is referenced by ${source.model.file.name} but was not selected; select or drop it together with the model`);
    }
    return new Uint8Array(await file.arrayBuffer());
};

const baseNameFor = (source: ModelSource): string => {
    const raw = source.kind === "files"
        ? source.model.file.name
        : decodeURIComponent(new URL(source.url, window.location.href).pathname.split("/").pop() ?? "");
    const base = raw.replace(/.gl(b|tf)$/i, "");
    return base.length > 0 ? `${base}.interactive` : "interactive";
};

/** Drops types no declaration/variable/event/node value references and remaps the remaining indices. */
export function pruneUnusedTypes(graph: IInteractivityGraph): IInteractivityGraph {
    const pruned: IInteractivityGraph = JSON.parse(JSON.stringify(graph));
    const holders: Array<{ type?: number; typeOptions?: number[] }> = [
        ...pruned.variables,
        ...pruned.events.flatMap((event) => Object.values(event.values ?? {})),
        ...pruned.declarations.flatMap((decl) => [
            ...Object.values(decl.inputValueSockets ?? {}),
            ...Object.values(decl.outputValueSockets ?? {}),
        ]),
        // exported node values are a flat socket-id map (spec layout), not {input, output}
        ...pruned.nodes.flatMap((node) => Object.values((node.values ?? {}) as Record<string, IInteractivityValue>)),
    ];

    const used = new Set<number>();
    for (const holder of holders) {
        if (typeof holder.type === "number") { used.add(holder.type); }
        holder.typeOptions?.forEach((t) => used.add(t));
    }
    // pointer/* nodes store a type index in their "type" configuration
    const typeConfigs = pruned.nodes
        .map((node) => node.configuration?.type)
        .filter((config): config is NonNullable<typeof config> =>
            typeof config?.value?.[0] === "number" && config.value[0] >= 0);
    typeConfigs.forEach((config) => used.add(config.value![0]));

    const remap = new Map<number, number>();
    pruned.types = pruned.types.filter((_, index) => {
        if (!used.has(index)) { return false; }
        remap.set(index, remap.size);
        return true;
    });
    for (const holder of holders) {
        if (typeof holder.type === "number") { holder.type = remap.get(holder.type); }
        if (holder.typeOptions) { holder.typeOptions = holder.typeOptions.map((t) => remap.get(t)!); }
    }
    for (const config of typeConfigs) {
        config.value = [remap.get(config.value![0])];
    }
    return pruned;
}

/**
 * Downloads the model with the graph embedded, as a self-contained .glb or as a .zip holding the
 * .gltf and every file it references (.bin, textures). The format is independent of the source's.
 */
export async function downloadInteractiveModel(source: ModelSource, graph: IInteractivityGraph, format: ModelExportFormat): Promise<void> {
    const input = await readSource(source);
    const resolve = resourceResolverFor(source);
    const baseName = baseNameFor(source);
    const exportedGraph = pruneUnusedTypes(graph);
    if (format === "glb") {
        const glb = await packageAsGlb(input, exportedGraph, resolve);
        saveBlob(new Blob([glb], { type: "model/gltf-binary" }), `${baseName}.glb`);
    } else {
        const files = await packageAsGltfFiles(input, exportedGraph, resolve, baseName);
        saveBlob(new Blob([createZip(files)], { type: "application/zip" }), `${baseName}.zip`);
    }
}

const saveBlob = (blob: Blob, fileName: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    // Firefox aborts the download if the object URL is revoked in the same tick as the click.
    setTimeout(() => URL.revokeObjectURL(url), 0);
};
