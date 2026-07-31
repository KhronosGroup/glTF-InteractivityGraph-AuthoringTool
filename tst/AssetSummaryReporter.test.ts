import { jest } from "@jest/globals";
import AssetSummaryReporter from "./assets/assetSummaryReporter.cjs";

describe("AssetSummaryReporter", () => {
    it("separates validation from execution and colors failed execution red", () => {
        const output: string[] = [];
        const write = jest.spyOn(process.stdout, "write").mockImplementation((chunk: any) => {
            output.push(String(chunk));
            return true;
        });
        const previousForceColor = process.env.FORCE_COLOR;
        const previousNoColor = process.env.NO_COLOR;
        process.env.FORCE_COLOR = "1";
        delete process.env.NO_COLOR;

        try {
            new AssetSummaryReporter().onRunComplete(undefined, {
                testResults: [
                    {
                        testFilePath: "/repo/tst/assets/validation.asset.ts",
                        testResults: [{
                            status: "passed",
                            title: "pointer/Example [subtests:2]",
                            ancestorTitles: [],
                        }],
                    },
                    {
                        testFilePath: "/repo/tst/assets/core.asset.ts",
                        testResults: [
                            {
                                status: "passed",
                                title: "pointer/Example / first",
                                ancestorTitles: ["Core assets", "pointer/Example"],
                            },
                            {
                                status: "failed",
                                title: "pointer/Example / second",
                                ancestorTitles: ["Core assets", "pointer/Example"],
                                failureMessages: ["expected [1], got [0]"],
                            },
                        ],
                    },
                ],
            });
        } finally {
            write.mockRestore();
            restoreEnvironment("FORCE_COLOR", previousForceColor);
            restoreEnvironment("NO_COLOR", previousNoColor);
        }

        const rendered = output.join("");
        const plain = rendered.replace(/\u001b\[[0-9;]*m/g, "");
        expect(plain).toContain("Validation: 1/1 assets passed schema validation");
        expect(plain).toContain("Execution: 1/2 subtests passed, 1 failed");
        expect(plain).toContain("pointer: Core 1/2");
        expect(plain).not.toContain("subtests behind valid graphs");
        expect(plain.indexOf("Execution:")).toBeLessThan(plain.indexOf("pointer:"));
        expect(rendered).toContain("\u001b[31mExecution: 1/2 subtests passed, 1 failed\u001b[0m");
        expect(rendered).toContain("\u001b[31mCore 1/2\u001b[0m");
    });
});

function restoreEnvironment(name: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[name];
    } else {
        process.env[name] = value;
    }
}
