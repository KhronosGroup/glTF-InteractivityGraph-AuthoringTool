import { RefObject, useEffect } from "react";

/**
 * .flow-node uses `content-visibility: auto` for off-screen rendering performance, which brings
 * paint containment with it and clips any in-node popup at the node boundary. Lift that
 * containment (and raise the node above its neighbours) only while `open` is true, so dropdowns
 * render in full without permanently disabling viewport culling.
 *
 * @param ref element inside the node — the nearest .flow-node ancestor is the one lifted
 * @param open whether the overlay is currently visible
 */
export const useLiftNodeContainment = (ref: RefObject<HTMLElement | null>, open: boolean) => {
    useEffect(() => {
        if (!open) return;
        const flowNode = ref.current?.closest(".flow-node");
        if (!flowNode) return;
        const reactFlowNode = flowNode.closest(".react-flow__node");
        flowNode.classList.add("flow-node--overlay-open");
        reactFlowNode?.classList.add("react-flow__node--overlay-open");
        return () => {
            flowNode.classList.remove("flow-node--overlay-open");
            reactFlowNode?.classList.remove("react-flow__node--overlay-open");
        };
    }, [ref, open]);
};
