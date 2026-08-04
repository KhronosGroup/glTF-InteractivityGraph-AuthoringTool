import { IInteractivityGraph } from "../../BasicBehaveEngine/types/InteractivityGraph";
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

export async function downloadInteractivityGlb(source: GlbSource, graph: IInteractivityGraph): Promise<void> {
    const output = embedInteractivityGraphInGlb(await readSource(source), graph);
    const url = URL.createObjectURL(new Blob([output], { type: "model/gltf-binary" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileNameFor(source);
    link.click();
    // Firefox aborts the download if the object URL is revoked in the same tick as the click.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
