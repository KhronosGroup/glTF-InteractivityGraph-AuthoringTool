import { getMessageTemplateSocketIds, parseMessageTemplate, populateMessageTemplate } from "../src/BasicBehaveEngine/messageTemplate";

describe("debug/log message template", () => {
    it("treats doubled brackets as literals", () => {
        expect(getMessageTemplateSocketIds("/nodes/{{}}/weights")).toEqual([]);
        expect(getMessageTemplateSocketIds("value {a} on {{node}} and {a}")).toEqual(["a"]);
    });

    it("rejects syntactically invalid templates", () => {
        for (const message of ["{", "}", "{a", "a}", "{a{b}}", "}{"]) {
            expect(parseMessageTemplate(message)).toBeUndefined();
        }
    });

    it("substitutes parameters and collapses doubled brackets", () => {
        const message = "{{x}} is {x}, {y}";
        const parameters = parseMessageTemplate(message)!;
        const values: Record<string, string> = { x: "1", y: "{2}" };
        expect(populateMessageTemplate(message, parameters, (id) => values[id])).toBe("{x} is 1, {2}");
    });
});
