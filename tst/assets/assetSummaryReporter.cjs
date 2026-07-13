const path = require("path");
const fs = require("fs");

const ENGINE_ORDER = ["Core", "Babylon", "Three"];
const CATEGORY_ORDER = [
    "pointer",
    "math",
    "flow",
    "event",
    "InterGlb",
    "Overview",
    "extras",
    "prerequisites",
    "ref",
    "type",
    "variable",
];

class AssetSummaryReporter {
    onRunComplete(_contexts, results) {
        const rows = collectRows(results);
        const validation = collectValidation(results);
        const failures = collectFailures(results);
        if (rows.size === 0 && validation.totalAssets === 0) {
            return;
        }

        const engines = collectEngines(rows);
        const categories = orderCategories([...rows.keys()]);
        const fullRun = engines.length > 1 || categories.includes("InterGlb") || categories.includes("Overview");

        process.stdout.write("\nAsset subtest summary\n");
        if (fullRun) {
            process.stdout.write("=====================\n");
        }

        if (validation.totalAssets > 0) {
            process.stdout.write(`Validation: ${validation.validAssets}/${validation.totalAssets} assets valid`);
            process.stdout.write(`, ${validation.validSubtests}/${validation.totalSubtests} subtests behind valid graphs\n`);
            if (validation.invalidAssets.length > 0) {
                process.stdout.write(`Invalid graphs: ${formatInvalidAssets(validation.invalidAssets)}\n`);
                process.stdout.write("Invalid graph details:\n");
                for (const asset of validation.invalidAssets) {
                    process.stdout.write(`- ${asset.name}: ${asset.reason ?? "graph did not validate"} (${asset.subtests} subtests)\n`);
                }
            }
            process.stdout.write("\n");
        }

        for (const category of categories) {
            const byEngine = rows.get(category);
            const cells = formatCells(engines, byEngine);
            if (cells.length > 0) {
                process.stdout.write(`${category}: ${cells.join(", ")}\n`);
            }
        }

        const missingEngines = ENGINE_ORDER.filter((engine) => !engines.includes(engine));
        if (rows.size > 0 && fullRun && missingEngines.length > 0) {
            process.stdout.write(`\nNo asset suite results for: ${missingEngines.join(", ")}\n`);
        }

        if (rows.size > 0) {
            const executionTotals = collectExecutionTotals(rows);
            process.stdout.write(`\nTotal: ${executionTotals.passed}/${executionTotals.total} passed`);
            if (executionTotals.failed > 0) {
                process.stdout.write(`, ${executionTotals.failed} failed`);
            }
            process.stdout.write("\n\n");
        } else {
            process.stdout.write("\n");
        }

        const specCoverage = shouldLogSpecCoverage() ? collectSpecPointerCoverage(results) : undefined;
        if (specCoverage) {
            process.stdout.write("Spec pointer coverage\n");
            process.stdout.write(`Read: ${formatCoverage(specCoverage.read.covered, specCoverage.read.total)}\n`);
            process.stdout.write(`Write: ${formatCoverage(specCoverage.write.covered, specCoverage.write.total)}\n`);
            if (specCoverage.read.missing.length > 0) {
                process.stdout.write(`Missing read pointers:\n${formatMissingPointers(specCoverage.read.missing)}`);
            }
            if (specCoverage.write.missing.length > 0) {
                process.stdout.write(`Missing write pointers:\n${formatMissingPointers(specCoverage.write.missing)}`);
            }
            process.stdout.write("\n");
        }

        if (failures.length > 0) {
            process.stdout.write("Failing assets:\n");
            for (const failure of failures) {
                process.stdout.write(`- ${failure.engine} ${failure.asset}: ${failure.failed}/${failure.total} failed`);
                if (failure.reason) {
                    process.stdout.write(` - ${failure.reason}`);
                }
                process.stdout.write("\n");
                for (const detail of failure.details) {
                    process.stdout.write(`  - ${detail.name}`);
                    if (detail.reason) {
                        process.stdout.write(` - ${detail.reason}`);
                    }
                    process.stdout.write("\n");
                }
            }
            process.stdout.write("\n");
        }
    }
}

function shouldLogSpecCoverage() {
    return process.env.KHR_INTERACTIVITY_SPEC_COVERAGE === "1";
}

function collectRows(results) {
    const rows = new Map();
    for (const testResult of results.testResults) {
        if (path.basename(testResult.testFilePath) === "validation.asset.ts") {
            continue;
        }
        for (const assertion of testResult.testResults ?? []) {
            if (assertion.status !== "passed" && assertion.status !== "failed") {
                continue;
            }

            const engine = getEngine(testResult.testFilePath, assertion.ancestorTitles);
            const category = getCategory(testResult.testFilePath, assertion);
            const byEngine = getOrCreate(rows, category, () => new Map());
            const stats = getOrCreate(byEngine, engine, () => ({ passed: 0, total: 0 }));

            stats.total += 1;
            if (assertion.status === "passed") {
                stats.passed += 1;
            }
        }
    }
    return rows;
}

function collectValidation(results) {
    const stats = {
        totalAssets: 0,
        validAssets: 0,
        totalSubtests: 0,
        validSubtests: 0,
        invalidAssets: [],
    };

    for (const testResult of results.testResults) {
        if (path.basename(testResult.testFilePath) !== "validation.asset.ts") {
            continue;
        }

        for (const assertion of testResult.testResults ?? []) {
            if (assertion.status !== "passed" && assertion.status !== "failed") {
                continue;
            }

            const subtests = getValidationSubtestCount(assertion.title);
            const name = assertion.title.replace(/\s+\[subtests:\d+\]$/, "");
            stats.totalAssets += 1;
            stats.totalSubtests += subtests;
            if (assertion.status === "passed") {
                stats.validAssets += 1;
                stats.validSubtests += subtests;
            } else {
                stats.invalidAssets.push({ name, subtests, reason: cleanFailureMessage(assertion.failureMessages?.[0]) });
            }
        }
    }

    return stats;
}

function collectFailures(results) {
    const byAsset = new Map();
    for (const testResult of results.testResults) {
        if (path.basename(testResult.testFilePath) === "validation.asset.ts") {
            continue;
        }
        for (const assertion of testResult.testResults ?? []) {
            if (assertion.status !== "passed" && assertion.status !== "failed") {
                continue;
            }

            const engine = getEngine(testResult.testFilePath, assertion.ancestorTitles);
            const asset = getAssetName(testResult.testFilePath, assertion);
            const key = `${engine}\0${asset}`;
            const stats = getOrCreate(byAsset, key, () => ({ engine, asset, failed: 0, total: 0, reason: undefined, details: [] }));

            stats.total += 1;
            if (assertion.status === "failed") {
                stats.failed += 1;
                const reason = cleanFailureMessage(assertion.failureMessages?.[0]);
                stats.reason = stats.reason ?? reason;
                stats.details.push({
                    name: getAssertionName(assertion),
                    reason,
                });
            }
        }
    }

    return [...byAsset.values()]
        .filter((failure) => failure.failed > 0)
        .sort((a, b) => engineRank(a.engine) - engineRank(b.engine)
            || b.failed - a.failed
            || a.asset.localeCompare(b.asset));
}

function collectEngines(rows) {
    const engines = new Set();
    for (const byEngine of rows.values()) {
        for (const engine of byEngine.keys()) {
            engines.add(engine);
        }
    }
    return [...engines].sort((a, b) => engineRank(a) - engineRank(b) || a.localeCompare(b));
}

function orderCategories(categories) {
    return categories.sort((a, b) => categoryRank(a) - categoryRank(b) || a.localeCompare(b));
}

function getEngine(testFilePath, ancestorTitles) {
    const haystack = `${testFilePath} ${ancestorTitles.join(" ")}`.toLowerCase();
    if (haystack.includes("three")) {
        return "Three";
    }
    if (haystack.includes("babylon") || path.basename(testFilePath) === "engines.asset.ts") {
        return "Babylon";
    }
    return "Core";
}

function getCategory(testFilePath, assertion) {
    const file = path.basename(testFilePath);
    if (file === "validation.asset.ts") {
        return "Validation";
    }
    if (file.startsWith("interglb")) {
        return "InterGlb";
    }
    if (file === "overview.asset.ts") {
        return "Overview";
    }

    const assetName = assertion.ancestorTitles[1] ?? assertion.title.split(" / ")[0];
    const rawCategory = assetName.split("/")[0].toLowerCase();
    if (rawCategory === "extras") {
        return "extras";
    }
    return rawCategory;
}

function getAssetName(testFilePath, assertion) {
    const file = path.basename(testFilePath);
    if (file === "overview.asset.ts") {
        return "Overview";
    }

    const assetTitle = [...assertion.ancestorTitles].reverse().find((title) => title.includes("/"));
    return assetTitle ?? assertion.ancestorTitles[assertion.ancestorTitles.length - 1] ?? assertion.title.split(" / ")[0];
}

function getAssertionName(assertion) {
    const title = assertion.title ?? "";
    const slashIndex = title.indexOf(" / ");
    return slashIndex === -1 ? title : title.slice(slashIndex + 3);
}

function formatCell(engine, stats) {
    return `${engine} ${stats.passed}/${stats.total}`;
}

function formatCells(engines, byEngine) {
    const presentEngines = engines.filter((engine) => byEngine.has(engine));
    if (presentEngines.length === 2 && presentEngines.includes("Core") && presentEngines.includes("Babylon")) {
        const core = byEngine.get("Core");
        const babylon = byEngine.get("Babylon");
        if (sameStats(core, babylon)) {
            return [`both ${core.passed}/${core.total}`];
        }
    }
    if (presentEngines.length > 2) {
        const first = byEngine.get(presentEngines[0]);
        if (presentEngines.every((engine) => sameStats(first, byEngine.get(engine)))) {
            return [`all ${first.passed}/${first.total}`];
        }
    }
    return presentEngines.map((engine) => formatCell(engine, byEngine.get(engine)));
}

function collectExecutionTotals(rows) {
    const totals = { passed: 0, failed: 0, total: 0 };
    for (const byEngine of rows.values()) {
        for (const stats of byEngine.values()) {
            totals.passed += stats.passed;
            totals.total += stats.total;
        }
    }
    totals.failed = totals.total - totals.passed;
    return totals;
}

function getValidationSubtestCount(title) {
    return Number(title.match(/\[subtests:(\d+)\]/)?.[1] ?? "0");
}

function formatInvalidAssets(invalidAssets) {
    const sorted = [...invalidAssets].sort((a, b) => b.subtests - a.subtests || a.name.localeCompare(b.name));
    const visible = sorted.map((asset) => `${asset.name} (${asset.subtests})`);
    return visible.join(", ");
}

function cleanFailureMessage(message) {
    if (!message) {
        return undefined;
    }

    const stripped = message
        .replace(/\u001b\[[0-9;]*m/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const first = stripped.find((line) => line.includes("expected "))
        ?? stripped.find((line) => line.includes("did not load or execute"))
        ?? stripped.find((line) => line.includes("did not validate"))
        ?? stripped.find((line) => line.startsWith("Error: "))
        ?? stripped[0];
    if (!first) {
        return undefined;
    }

    const normalized = first.replace(/^Error:\s*/, "");
    const expectedIndex = normalized.indexOf("expected ");
    return (expectedIndex === -1 ? normalized : normalized.slice(expectedIndex)).slice(0, 240);
}

function sameStats(a, b) {
    return a.passed === b.passed && a.total === b.total;
}

function getOrCreate(map, key, create) {
    if (!map.has(key)) {
        map.set(key, create());
    }
    return map.get(key);
}

function engineRank(engine) {
    const rank = ENGINE_ORDER.indexOf(engine);
    return rank === -1 ? ENGINE_ORDER.length : rank;
}

function categoryRank(category) {
    const rank = CATEGORY_ORDER.indexOf(category);
    return rank === -1 ? CATEGORY_ORDER.length : rank;
}

function collectSpecPointerCoverage(results) {
    try {
        const metadata = readSchemaMetadata();
        const pointers = (metadata.objectModelPointers ?? [])
            .filter((pointer) => pointer.typeName !== "float[]")
            .map((pointer) => ({ ...pointer, template: canonicalPointer(pointer.template) }));
        const readable = uniquePointers(pointers);
        const writable = uniquePointers(pointers.filter((pointer) => pointer.readOnly !== true));
        const exercised = scanExercisedPointers(results);
        return {
            read: summarizePointerCoverage(readable, exercised.read),
            write: summarizePointerCoverage(writable, exercised.write),
        };
    } catch (error) {
        process.stdout.write(`Spec pointer coverage unavailable: ${error instanceof Error ? error.message : String(error)}\n\n`);
        return undefined;
    }
}

function summarizePointerCoverage(expectedPointers, exercisedPointers) {
    const expected = expectedPointers.map((pointer) => pointer.template).sort();
    const expectedSet = new Set(expected);
    const covered = [...exercisedPointers].filter((pointer) => expectedSet.has(pointer)).length;
    const missing = expected.filter((pointer) => !exercisedPointers.has(pointer));
    return {
        covered,
        total: expected.length,
        missing,
    };
}

function uniquePointers(pointers) {
    const byTemplate = new Map();
    for (const pointer of pointers) {
        byTemplate.set(pointer.template, pointer);
    }
    return [...byTemplate.values()].sort((a, b) => a.template.localeCompare(b.template));
}

function scanExercisedPointers(results) {
    const read = new Set();
    const write = new Set();
    for (const assetCase of loadCoverageAssetCases(collectCoverageScope(results))) {
        const gltf = readGlbJson(assetCase.glbPath);
        const interactivity = gltf.extensions?.KHR_interactivity;
        const graph = interactivity?.graphs?.[interactivity.graph ?? 0];
        if (!graph) {
            continue;
        }
        for (const node of graph.nodes ?? []) {
            const op = graph.declarations?.[node.declaration]?.op;
            const pointer = node.configuration?.pointer?.value?.[0];
            if (typeof pointer !== "string") {
                continue;
            }
            const canonical = canonicalPointer(pointer);
            if (op === "pointer/get") {
                read.add(canonical);
            } else if (op === "pointer/set" || op === "pointer/interpolate") {
                write.add(canonical);
            }
        }
    }
    return { read, write };
}

function collectCoverageScope(results) {
    const scope = {
        singleFileAssets: false,
        overview: false,
        interGlb: false,
    };

    for (const testResult of results.testResults) {
        const file = path.basename(testResult.testFilePath);
        if (!hasExecutedAssertions(testResult)) {
            continue;
        }
        if (file === "core.asset.ts" || file === "engines.asset.ts") {
            scope.singleFileAssets = true;
        } else if (file === "overview.asset.ts") {
            scope.overview = true;
        } else if (file === "interglb.asset.ts" || file === "interglb.babylon.asset.ts") {
            scope.interGlb = true;
        }
    }

    return scope;
}

function hasExecutedAssertions(testResult) {
    return (testResult.testResults ?? []).some((assertion) => assertion.status === "passed" || assertion.status === "failed");
}

function loadCoverageAssetCases(scope) {
    const root = path.join(getSampleAssetsRoot(), "Tests", "Interactivity");
    if (!fs.existsSync(root)) {
        return [];
    }

    const nameFilter = process.env.KHR_INTERACTIVITY_ASSET_NAME_FILTER;
    const filter = process.env.KHR_INTERACTIVITY_ASSET_FILTER;
    const limit = Number(process.env.KHR_INTERACTIVITY_ASSET_LIMIT ?? "0");
    const allCases = findTestJsonFiles(root)
        .map((metadataPath) => {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
            const assetDir = path.dirname(path.dirname(metadataPath));
            const name = path.relative(root, assetDir) || metadata.name;
            return {
                name,
                label: metadata.name || name,
                tags: metadata.usedSchemas ?? [],
                glbPath: path.join(assetDir, "glTF-Binary", metadata.glbFileName),
            };
        })
        .filter(Boolean)
        .filter((assetCase) => !nameFilter || assetCase.name === nameFilter)
        .filter((assetCase) => !filter || assetCase.name.includes(filter) || assetCase.label.includes(filter) || assetCase.tags.includes(filter));

    const cases = [];
    if (scope.singleFileAssets) {
        cases.push(...allCases.filter((assetCase) => !assetCase.name.startsWith("InterGlb/")));
    }
    if (scope.interGlb) {
        cases.push(...allCases.filter((assetCase) => assetCase.name.startsWith("InterGlb/")));
    }
    if (scope.overview) {
        const overviewCase = loadOverviewCoverageCase(root);
        if (overviewCase && matchesCoverageFilters(overviewCase, nameFilter, filter)) {
            cases.push(overviewCase);
        }
    }

    return dedupeAssetCases(cases).slice(0, limit > 0 ? limit : undefined);
}

function loadOverviewCoverageCase(root) {
    const metadataPath = path.join(root, "Overview.json");
    if (!fs.existsSync(metadataPath)) {
        return undefined;
    }
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    return {
        name: metadata.name,
        label: metadata.name,
        tags: metadata.usedSchemas ?? [],
        glbPath: path.join(root, metadata.glbFileName),
    };
}

function findTestJsonFiles(root) {
    const files = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && fullPath.includes(`${path.sep}test-Json${path.sep}`) && fullPath.endsWith(".json")) {
                files.push(fullPath);
            }
        }
    };
    walk(root);
    return files.sort();
}

function matchesCoverageFilters(assetCase, nameFilter, filter) {
    return (!nameFilter || assetCase.name === nameFilter)
        && (!filter || assetCase.name.includes(filter) || assetCase.label.includes(filter) || assetCase.tags.includes(filter));
}

function dedupeAssetCases(cases) {
    const byPath = new Map();
    for (const assetCase of cases) {
        byPath.set(assetCase.glbPath, assetCase);
    }
    return [...byPath.values()];
}

function readGlbJson(glbPath) {
    const buffer = fs.readFileSync(glbPath);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    let offset = 12;
    while (offset < view.byteLength) {
        const chunkLength = view.getUint32(offset, true);
        const chunkType = view.getUint32(offset + 4, true);
        if (chunkType === 0x4e4f534a) {
            const jsonBytes = new Uint8Array(buffer.buffer, buffer.byteOffset + offset + 8, chunkLength);
            return JSON.parse(new TextDecoder().decode(jsonBytes).trim());
        }
        offset += 8 + chunkLength;
    }
    throw new Error(`GLB JSON chunk missing in ${glbPath}`);
}

function readSchemaMetadata() {
    const metadataPath = path.resolve(process.cwd(), "src", "objectModel", "generated", "glTFSchemaMetadata.ts");
    const source = fs.readFileSync(metadataPath, "utf8");
    const match = source.match(/export const glTFSchemaMetadata = ([\s\S]*) as const;\s*$/);
    if (!match) {
        throw new Error(`Could not parse ${metadataPath}`);
    }
    return JSON.parse(match[1]);
}

function getSampleAssetsRoot() {
    return process.env.KHR_INTERACTIVITY_SAMPLE_ASSETS ?? path.resolve(process.cwd(), "../glTF-Test-Assets-Interactivity");
}

function canonicalPointer(pointer) {
    const arraySegments = new Set([
        "animations",
        "cameras",
        "children",
        "joints",
        "lights",
        "materials",
        "meshes",
        "nodes",
        "primitives",
        "scenes",
        "skins",
        "weights",
    ]);

    const segments = pointer.split("/");
    return segments.map((segment, index) => {
        if (/^\[[^\]]+\]$/.test(segment)) {
            return "[]";
        }
        if (/^\{[^}]+\}$/.test(segment)) {
            return "{}";
        }
        if (/^\d+$/.test(segment) && arraySegments.has(segments[index - 1])) {
            return "[]";
        }
        return segment;
    }).join("/");
}

function formatCoverage(covered, total) {
    const percent = total === 0 ? 100 : (covered / total) * 100;
    return `${covered}/${total} (${percent.toFixed(1)}%)`;
}

function formatMissingPointers(pointers) {
    return pointers.map((pointer) => `- ${pointer}\n`).join("");
}

module.exports = AssetSummaryReporter;
