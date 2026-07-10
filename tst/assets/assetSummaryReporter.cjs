const path = require("path");

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
    }
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
                stats.invalidAssets.push({ name, subtests });
            }
        }
    }

    return stats;
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
    if (file === "interglb.asset.ts") {
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
    const visible = sorted.slice(0, 8).map((asset) => `${asset.name} (${asset.subtests})`);
    if (sorted.length > visible.length) {
        visible.push(`+${sorted.length - visible.length} more`);
    }
    return visible.join(", ");
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

module.exports = AssetSummaryReporter;
