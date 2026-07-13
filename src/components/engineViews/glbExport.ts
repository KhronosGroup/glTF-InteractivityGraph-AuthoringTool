import { IInteractivityGraph } from "../../BasicBehaveEngine/types/InteractivityGraph";
import { embedInteractivityGraphInGlb } from "../../objectModel/glTFBinary";

export async function downloadInteractivityGlb(file: File, graph: IInteractivityGraph): Promise<void> {
    const output = embedInteractivityGraphInGlb(await file.arrayBuffer(), graph);
    const url = URL.createObjectURL(new Blob([output], { type: "model/gltf-binary" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "interactive.glb";
    link.click();
    URL.revokeObjectURL(url);
}
