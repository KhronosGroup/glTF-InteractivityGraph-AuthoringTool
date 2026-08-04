import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { jest } from "@jest/globals";
import {
    buildSampleUrl,
    resolveSampleVariant,
    Sample,
    SampleSidebar,
} from "../src/components/SampleSidebar";

const showcase: Sample = {
    label: "Bow Shooting",
    name: "BowShooting",
    variants: {
        "glTF-Binary": "BowShooting.glb",
        glTF: "BowShooting.gltf",
    },
};

const testAsset: Sample = {
    label: "Pointer Get",
    name: "pointer/get",
    variants: {
        "glTF-Binary": "get.glb",
        "test-Json": "get.json",
    },
};

describe("SampleSidebar variants", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            value: jest.fn((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            })),
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        if (originalFetch) {
            Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
        } else {
            Reflect.deleteProperty(globalThis, "fetch");
        }
    });

    it("builds URLs for JSON glTF variants and falls back for GLB-only assets", () => {
        expect(resolveSampleVariant(showcase, "glTF")).toBe("glTF");
        expect(buildSampleUrl(showcase, false, "glTF")).toBe(
            "https://raw.githubusercontent.com/KhronosGroup/glTF-Test-Assets-Interactivity/main/Models/BowShooting/glTF/BowShooting.gltf",
        );
        expect(resolveSampleVariant(testAsset, "glTF")).toBe("glTF-Binary");
    });

    it("loads the selected JSON glTF variant from the sidebar", async () => {
        const fetchMock = jest.fn<typeof fetch>()
            .mockResolvedValueOnce(mockResponse([showcase]))
            .mockResolvedValueOnce(mockResponse([testAsset]))
            .mockResolvedValueOnce(mockResponse([]));
        Object.defineProperty(globalThis, "fetch", { configurable: true, value: fetchMock });
        const onSelectModel = jest.fn();
        render(<SampleSidebar onSelectModel={onSelectModel} />);

        fireEvent.click(screen.getByRole("button", { name: /Samples and Tests/ }));
        await screen.findByText("Bow Shooting");
        fireEvent.click(screen.getByLabelText("glTF"));
        fireEvent.click(screen.getByText("Bow Shooting"));

        await waitFor(() => expect(onSelectModel).toHaveBeenCalledWith(
            "https://raw.githubusercontent.com/KhronosGroup/glTF-Test-Assets-Interactivity/main/Models/BowShooting/glTF/BowShooting.gltf",
        ));
    });
});

function mockResponse(value: unknown): Response {
    return {
        ok: true,
        status: 200,
        json: async () => value,
    } as Response;
}
