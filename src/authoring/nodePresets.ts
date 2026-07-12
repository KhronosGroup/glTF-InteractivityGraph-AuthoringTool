import { IInteractivityConfigurationValue, InteractivityValueType } from "../BasicBehaveEngine/types/InteractivityGraph";
import { AuthoredNode } from "./spec/AuthoredGraph";
import { standardTypes } from "./spec/nodes";
import { reconcileNodeSockets, SocketReconcilerContext } from "./socketReconciler";
import { joinSearchTerms } from "./searchText";

export interface NodePreset {
    id: string;
    label: string;
    op: string;
    description?: string;
    aliases?: string[];
    configuration?: Record<string, IInteractivityConfigurationValue>;
}

const getStandardTypeIndex = (signature: InteractivityValueType): number => {
    const index = standardTypes.findIndex((type) => type.signature === signature);
    if (index === -1) {
        throw new Error(`Missing standard KHR_interactivity type ${signature}`);
    }
    return index;
};

export const nodePresets: NodePreset[] = [
    {
        id: "animation-max-time",
        label: "Animation · max time",
        op: "pointer/get",
        description: "Read an animation's maximum timeline time.",
        aliases: ["duration", "length", "animation duration", "animation length", "end time"],
        configuration: {
            pointer: { value: ["/animations/[animation]/extensions/KHR_interactivity/maxTime"] },
            type: { value: [getStandardTypeIndex(InteractivityValueType.FLOAT)] },
        },
    },
    {
        id: "animation-is-playing",
        label: "Animation · is playing",
        op: "pointer/get",
        description: "Read whether an animation is currently playing.",
        aliases: ["playing", "is playing", "animation playing", "animation state"],
        configuration: {
            pointer: { value: ["/animations/[animation]/extensions/KHR_interactivity/isPlaying"] },
            type: { value: [getStandardTypeIndex(InteractivityValueType.BOOLEAN)] },
        },
    },
];

export const getNodePresetSearchText = (preset: NodePreset): string =>
    joinSearchTerms(preset.label, preset.op, preset.description, preset.aliases);

export const applyNodePreset = (
    node: AuthoredNode,
    preset: NodePreset,
    ctx: SocketReconcilerContext,
): AuthoredNode => {
    const configuration = {
        ...(node.configuration ?? {}),
        ...(preset.configuration ?? {}),
    };
    const reconciled = reconcileNodeSockets({
        op: node.op,
        isNoOp: false,
        configuration,
        inputValues: node.values?.input ?? {},
        outputValues: node.values?.output ?? {},
        inputFlows: node.flows?.input ?? {},
        outputFlows: node.flows?.output ?? {},
        events: ctx.events,
        variables: ctx.variables,
    });

    const result: AuthoredNode = {
        ...node,
        configuration,
        values: {
            ...(node.values ?? {}),
            input: reconciled.inputValues,
            output: reconciled.outputValues,
        },
    };
    if (
        node.flows !== undefined ||
        Object.keys(reconciled.inputFlows).length > 0 ||
        Object.keys(reconciled.outputFlows).length > 0
    ) {
        result.flows = {
            ...(node.flows ?? {}),
            ...(Object.keys(reconciled.inputFlows).length > 0 ? { input: reconciled.inputFlows } : {}),
            ...(Object.keys(reconciled.outputFlows).length > 0 ? { output: reconciled.outputFlows } : {}),
        };
    }
    return result;
};
