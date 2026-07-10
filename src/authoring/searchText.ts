export const joinSearchTerms = (...terms: Array<string | readonly string[] | undefined>): string =>
    terms
        .flatMap((term) => Array.isArray(term) ? term : [term])
        .filter((term): term is string => typeof term === "string" && term.trim() !== "")
        .join(" ")
        .toLowerCase();
