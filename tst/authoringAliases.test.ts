import { getPointerCatalogueSearchText, pointerCatalogue } from "../src/authoring/pointerCatalogue";
import { applyNodePreset, getNodePresetSearchText, nodePresets } from "../src/authoring/nodePresets";
import { interactivityNodeSpecs } from "../src/authoring/spec/nodes";
import { joinSearchTerms } from "../src/authoring/searchText";
import { AuthoredNode } from "../src/authoring/spec/AuthoredGraph";

describe("authoring aliases", () => {
    it("makes node picker search terms data-driven", () => {
        const onSelect = interactivityNodeSpecs.find((node) => node.op === "event/onSelect")!;
        const animationStart = interactivityNodeSpecs.find((node) => node.op === "animation/start")!;

        expect(joinSearchTerms(onSelect.op, onSelect.description, onSelect.aliases)).toContain("click");
        expect(joinSearchTerms(animationStart.op, animationStart.description, animationStart.aliases)).toContain("play");
    });

    it("makes pointer catalogue search terms data-driven", () => {
        const maxTime = pointerCatalogue.find((entry) => entry.template === "/animations/[animation]/extensions/KHR_interactivity/maxTime")!;

        expect(getPointerCatalogueSearchText(maxTime)).toContain("duration");
        expect(getPointerCatalogueSearchText(maxTime)).toContain("length");
    });

    it("creates a spec-shaped pointer/get node from the animation length preset", () => {
        const preset = nodePresets.find((candidate) => candidate.id === "animation-max-time")!;
        const spec = interactivityNodeSpecs.find((node) => node.op === preset.op)!;
        const node = applyNodePreset(
            JSON.parse(JSON.stringify(spec)) as AuthoredNode,
            preset,
            { nodeType: preset.op, events: {}, variables: [] },
        );

        expect(getNodePresetSearchText(preset)).toContain("length");
        expect(node.op).toBe("pointer/get");
        expect(node.configuration?.pointer.value).toEqual(["/animations/[animation]/extensions/KHR_interactivity/maxTime"]);
        expect(node.configuration?.type.value).toEqual([2]);
        expect(node.values?.input?.animation.type).toBe(1);
        expect(node.values?.output?.value.type).toBe(2);
    });
});
