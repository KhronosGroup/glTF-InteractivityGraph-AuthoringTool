import { IInteractivityConfigurationValue, InteractivityValueType } from "../BasicBehaveEngine/types/InteractivityGraph";
import { AuthoredNode, NodeSpecFlag } from "./spec/AuthoredGraph";
import { hasNodeSpecFlag, interactivityNodeSpecs, standardTypes } from "./spec/nodes";
import { computeConfigDrivenSockets, mergeFlowSockets, mergeValueSockets, SocketReconcilerContext } from "./socketReconciler";
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
    const spec = interactivityNodeSpecs.find((candidate) => candidate.op === node.op);
    const configuration = {
        ...(node.configuration ?? {}),
        ...(preset.configuration ?? {}),
    };
    const inputValues = node.values?.input ?? {};
    const outputValues = node.values?.output ?? {};
    const inputFlows = node.flows?.input ?? {};
    const outputFlows = node.flows?.output ?? {};
    const generated = computeConfigDrivenSockets(configuration, inputValues, ctx);
    const allowsDynamicSockets = hasNodeSpecFlag(spec, NodeSpecFlag.DynamicSockets);

    const mergedInputValues = mergeValueSockets({
        existing: inputValues,
        generated: generated.inputValues,
        specDefaults: spec?.values?.input ?? {},
        extraKeys: allowsDynamicSockets ? [] : Object.keys(inputValues),
        preservedKeys: generated.preservedPointerSlotIds,
        pointerSlotTypeById: generated.pointerSlotTypeById,
        allowExistingToOverrideGenerated: true,
    });
    const mergedOutputValues = mergeValueSockets({
        existing: outputValues,
        generated: generated.outputValues,
        specDefaults: spec?.values?.output ?? {},
        extraKeys: [],
        allowExistingToOverrideGenerated: false,
    });
    const mergedInputFlows = mergeFlowSockets({
        existing: inputFlows,
        generated: generated.inputFlows,
        specDefaults: spec?.flows?.input ?? {},
    });
    let mergedOutputFlows = mergeFlowSockets({
        existing: outputFlows,
        generated: generated.outputFlows,
        specDefaults: spec?.flows?.output ?? {},
        extraKeys: allowsDynamicSockets ? [] : Object.keys(outputFlows),
    });
    if (hasNodeSpecFlag(spec, NodeSpecFlag.DynamicFlowOutputs)) {
        mergedOutputFlows = { ...mergedOutputFlows, ...outputFlows };
    }

    const result: AuthoredNode = {
        ...node,
        configuration,
        values: {
            ...(node.values ?? {}),
            input: mergedInputValues,
            output: mergedOutputValues,
        },
    };
    if (
        node.flows !== undefined ||
        Object.keys(mergedInputFlows).length > 0 ||
        Object.keys(mergedOutputFlows).length > 0
    ) {
        result.flows = {
            ...(node.flows ?? {}),
            ...(Object.keys(mergedInputFlows).length > 0 ? { input: mergedInputFlows } : {}),
            ...(Object.keys(mergedOutputFlows).length > 0 ? { output: mergedOutputFlows } : {}),
        };
    }
    return result;
};
