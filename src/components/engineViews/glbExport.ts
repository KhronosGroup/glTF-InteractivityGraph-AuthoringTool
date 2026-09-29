import { IInteractivityGraph, IInteractivityValue } from "../../BasicBehaveEngine/types/InteractivityGraph";
import { embedInteractivityGraphInGlb } from "../../objectModel/glTFBinary";

/** The glb the viewport is currently showing, either a local upload or a fetched sample URL. */
export type GlbSource =
    | { kind: "file"; file: File }
    | { kind: "url"; url: string };

const readSource = async (source: GlbSource): Promise<ArrayBuffer> => {
    if (source.kind === "file") {
        return source.file.arrayBuffer();
    }
    const response = await fetch(source.url);
    if (!response.ok) {
        throw new Error(`Failed to fetch glb (${response.status} ${response.statusText}): ${source.url}`);
    }
    return response.arrayBuffer();
};

const fileNameFor = (source: GlbSource): string => {
    const raw = source.kind === "file"
        ? source.file.name
        : decodeURIComponent(new URL(source.url, window.location.href).pathname.split("/").pop() ?? "");
    const base = raw.replace(/\.glb$/i, "");
    return base.length > 0 ? `${base}.interactive.glb` : "interactive.glb";
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

export async function downloadInteractivityGlb(source: GlbSource, graph: IInteractivityGraph): Promise<void> {
    const output = embedInteractivityGraphInGlb(await readSource(source), pruneUnusedTypes(graph));
    const url = URL.createObjectURL(new Blob([output], { type: "model/gltf-binary" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileNameFor(source);
    link.click();
    // Firefox aborts the download if the object URL is revoked in the same tick as the click.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
