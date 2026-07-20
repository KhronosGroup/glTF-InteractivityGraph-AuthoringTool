import fs from "fs";
import path from "path";
import { ADecorator } from "../../src/BasicBehaveEngine/ADecorator";
import { BasicBehaveEngine } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import { IEventBus, IEventQueueItem, IInterpolateAction } from "../../src/BasicBehaveEngine/IBehaveEngine";
import { IInteractivityVariable } from "../../src/BasicBehaveEngine/types/InteractivityGraph";
import { createGlTFObjectModelFromGltf, GlTFObjectModelDecorator, readGlbJsonFromArrayBuffer } from "../../src/objectModel/glTFObjectModel";

export interface AssetIndexEntry {
    label: string;
    name: string;
    tags: string[];
    variants: {
        "glTF-Binary": string;
        "test-Json": string;
    };
}

export interface AssetSubTest {
    name: string;
    resultVarId: number;
    resultVarType: string;
    expectedResultValue: unknown[];
    successResultVarId: number;
    successResultVarName: string;
}

export interface AssetTestMetadata {
    glbFileName: string;
    name: string;
    tests: {
        name: string;
        subTests: AssetSubTest[];
    }[];
}

export interface AssetCase {
    entry: AssetIndexEntry;
    glbPath: string;
    metadataPath: string;
    metadata: AssetTestMetadata;
    gltf?: any;
    graph?: any;
    loadError?: Error;
}

export interface AssetSubTestCase {
    displayName: string;
    testName: string;
    subTest: AssetSubTest;
}

export type InterGlbMode = "exclude" | "include" | "only";

export interface LoadAssetCasesOptions {
    interGlb?: InterGlbMode;
    applyEnvFilters?: boolean;
}

export const DEFAULT_SAMPLE_ASSETS_ROOT = path.resolve(process.cwd(), "../glTF-Test-Assets-Interactivity");
const FLOAT_ABSOLUTE_TOLERANCE = 0.05;
const FLOAT_RELATIVE_TOLERANCE = 0.03;

export function getSampleAssetsRoot(): string {
    return process.env.KHR_INTERACTIVITY_SAMPLE_ASSETS ?? DEFAULT_SAMPLE_ASSETS_ROOT;
}

export function loadAssetCases(options: LoadAssetCasesOptions = {}): AssetCase[] {
    const root = path.join(getSampleAssetsRoot(), "Tests", "Interactivity");
    if (!fs.existsSync(root)) {
        throw new Error(`KHR_interactivity sample assets not found at ${root}. Set KHR_INTERACTIVITY_SAMPLE_ASSETS to the repo root.`);
    }

    const interGlbMode = options.interGlb ?? "exclude";
    const applyEnvFilters = options.applyEnvFilters ?? true;
    const nameFilter = applyEnvFilters ? process.env.KHR_INTERACTIVITY_ASSET_NAME_FILTER : undefined;
    const filter = applyEnvFilters ? process.env.KHR_INTERACTIVITY_ASSET_FILTER : undefined;
    const limit = applyEnvFilters ? Number(process.env.KHR_INTERACTIVITY_ASSET_LIMIT ?? "0") : 0;

    return loadAssetEntries(root)
        .filter((entry) => {
            const isInterGlb = entry.name.startsWith("InterGlb");
            if (interGlbMode === "only") {
                return isInterGlb;
            }
            return interGlbMode === "include" || !isInterGlb;
        })
        .filter((entry) => !nameFilter || entry.name === nameFilter)
        .filter((entry) => !filter || entry.name.includes(filter) || entry.label.includes(filter) || entry.tags.includes(filter))
        .slice(0, limit > 0 ? limit : undefined)
        .map((entry) => {
            const glbPath = path.join(root, entry.name, "glTF-Binary", entry.variants["glTF-Binary"]);
            const metadataPath = path.join(root, entry.name, "test-Json", entry.variants["test-Json"]);
            const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as AssetTestMetadata;

            try {
                const gltf = readGlbJson(glbPath);
                const interactivity = gltf.extensions?.KHR_interactivity;
                const graphIndex = interactivity?.graph ?? 0;
                const graph = interactivity?.graphs?.[graphIndex];

                if (!graph) {
                    throw new Error(`No KHR_interactivity graph found in ${glbPath}`);
                }

                return { entry, glbPath, metadataPath, metadata, gltf, graph };
            } catch (error) {
                return { entry, glbPath, metadataPath, metadata, loadError: toError(error) };
            }
        });
}

export function loadOverviewAssetCase(): AssetCase {
    const root = path.join(getSampleAssetsRoot(), "Tests", "Interactivity");
    const metadataPath = path.join(root, "Overview.json");
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as AssetTestMetadata;
    const glbPath = path.join(root, metadata.glbFileName);
    const entry: AssetIndexEntry = {
        label: metadata.name,
        name: metadata.name,
        tags: [],
        variants: {
            "glTF-Binary": metadata.glbFileName,
            "test-Json": path.basename(metadataPath),
        },
    };

    try {
        const gltf = readGlbJson(glbPath);
        const interactivity = gltf.extensions?.KHR_interactivity;
        const graphIndex = interactivity?.graph ?? 0;
        const graph = interactivity?.graphs?.[graphIndex];

        if (!graph) {
            throw new Error(`No KHR_interactivity graph found in ${glbPath}`);
        }

        return { entry, glbPath, metadataPath, metadata, gltf, graph };
    } catch (error) {
        return { entry, glbPath, metadataPath, metadata, loadError: toError(error) };
    }
}

export function loadAssetEntries(root = path.join(getSampleAssetsRoot(), "Tests", "Interactivity")): AssetIndexEntry[] {
    const indexNames = ["test-index.json", "mathtests-index.json"];
    const entries = indexNames.flatMap((indexName) => {
        const indexPath = path.join(root, indexName);
        return JSON.parse(fs.readFileSync(indexPath, "utf8")) as AssetIndexEntry[];
    });
    const knownMetadataPaths = new Set(entries.map((entry) => path.join(root, entry.name, "test-Json", entry.variants["test-Json"])));

    const discoveredEntries = findTestJsonFiles(root)
        .filter((metadataPath) => !knownMetadataPaths.has(metadataPath))
        .map((metadataPath) => createDiscoveredAssetEntry(root, metadataPath))
        .sort((a, b) => a.name.localeCompare(b.name));

    return [...entries, ...discoveredEntries];
}

function findTestJsonFiles(root: string): string[] {
    const files: string[] = [];
    const walk = (dir: string): void => {
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
    return files;
}

function createDiscoveredAssetEntry(root: string, metadataPath: string): AssetIndexEntry {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as AssetTestMetadata;
    const assetDir = path.dirname(path.dirname(metadataPath));
    const name = path.relative(root, assetDir);
    return {
        label: metadata.name || name,
        name,
        tags: [],
        variants: {
            "glTF-Binary": metadata.glbFileName,
            "test-Json": path.basename(metadataPath),
        },
    };
}

export function getAssetSubTests(metadata: AssetTestMetadata): AssetSubTestCase[] {
    return metadata.tests.flatMap((test) => test.subTests.map((subTest) => ({
        displayName: `${test.name} / ${subTest.name}`,
        testName: test.name,
        subTest,
    })));
}

export function readGlbJson(glbPath: string): any {
    const bytes = fs.readFileSync(glbPath);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return readGlbJsonFromArrayBuffer(arrayBuffer);
}

export class TestEventBus implements IEventBus {
    private eventList: IEventQueueItem[] = [];
    private customEventListeners: Record<string, ((event: CustomEvent) => void)[]> = {};
    private variableInterpolationCallbacks: Record<number, IInterpolateAction> = {};
    private pointerInterpolationCallbacks: Record<string, IInterpolateAction> = {};

    getEventList = (): IEventQueueItem[] => this.eventList;
    clearEventList = (): void => {
        this.eventList = [];
    };
    addEvent = (event: IEventQueueItem): void => {
        this.eventList.push(event);
    };
    addCustomEventListener = (name: string, func: (event: CustomEvent) => void): void => {
        this.customEventListeners[name] = this.customEventListeners[name] ?? [];
        this.customEventListeners[name].push(func);
    };
    clearCustomEventListeners = (): void => {
        this.customEventListeners = {};
    };
    dispatchCustomEvent = (name: string, vals: Record<string, any>): void => {
        const event = { type: name, detail: vals } as CustomEvent;
        for (const listener of this.customEventListeners[name] ?? []) {
            this.eventList.push({ func: () => listener(event), inSocketId: name });
        }
    };
    getCustomEventsNames = (): string[] => Object.keys(this.customEventListeners);
    setVariableInterpolationCallback = (variable: number, action: IInterpolateAction): void => {
        this.variableInterpolationCallbacks[variable] = action;
    };
    getVariableInterpolationCallbacks = (): Record<number, IInterpolateAction> => this.variableInterpolationCallbacks;
    clearVariableInterpolation = (variable: number): void => {
        delete this.variableInterpolationCallbacks[variable];
    };
    setPointerInterpolationCallback = (pointer: string, action: IInterpolateAction): void => {
        this.pointerInterpolationCallbacks[pointer] = action;
    };
    getPointerInterpolationCallbacks = (): Record<string, IInterpolateAction> => this.pointerInterpolationCallbacks;
    clearPointerInterpolation = (pointer: string): void => {
        delete this.pointerInterpolationCallbacks[pointer];
    };
}

export async function runGraphAndWait(decorator: ADecorator, graph: any): Promise<void> {
    decorator.loadBehaveGraph(structuredCloneFallback(graph));
    const waitMs = Math.max(20, Math.ceil(getGraphSettleSeconds(graph) * 1000));
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    decorator.executeEventQueueTick();
    decorator.pauseEventQueue();
    decorator.clearCustomEventListeners();
}

export async function runGraphsAndWait(decorators: ADecorator[], graphs: any[]): Promise<void> {
    graphs.forEach((graph, index) => decorators[index].loadBehaveGraph(structuredCloneFallback(graph), false));
    decorators[0].playEventQueue();
    const waitSeconds = Math.max(...graphs.map(getGraphSettleSeconds));
    const waitMs = Math.max(20, Math.ceil(waitSeconds * 1000));
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    decorators[0].executeEventQueueTick();
    decorators.forEach((decorator) => decorator.pauseEventQueue());
    decorators[0].clearCustomEventListeners();
}

export function validateGraphLoad(assetCase: AssetCase): void {
    if (assetCase.loadError) {
        throw assetCase.loadError;
    }

    const eventBus = new TestEventBus();
    const engine = new BasicBehaveEngine(60, eventBus);
    const decorator = new GlTFObjectModelDecorator(engine, createGlTFObjectModelFromGltf(assetCase.gltf));
    decorator.loadBehaveGraph(structuredCloneFallback(assetCase.graph), false);
    decorator.pauseEventQueue();
    decorator.clearCustomEventListeners();
}

export function assertAssetSubTests(caseName: string, variables: IInteractivityVariable[], metadata: AssetTestMetadata): void {
    const failures: string[] = [];
    for (const test of metadata.tests) {
        for (const subTest of test.subTests) {
            const failure = getSubTestFailure(variables, subTest);
            if (failure) {
                failures.push(`${subTest.name}: ${failure}`);
            }
        }
    }

    if (failures.length > 0) {
        throw new Error(`${caseName} failed ${failures.length} subtest(s):\n${failures.join("\n")}`);
    }
}

export function assertAssetSubTest(caseName: string, variables: IInteractivityVariable[], subTest: AssetSubTest): void {
    const failure = getSubTestFailure(variables, subTest);
    if (failure) {
        throw new Error(`${caseName} / ${subTest.name}: ${failure}`);
    }
}

export function formatError(error: unknown): string {
    const normalized = toError(error);
    return normalized.stack ?? normalized.message;
}

export function getGraphSettleSeconds(graph: any): number {
    const maxWait = Number(process.env.KHR_INTERACTIVITY_ASSET_MAX_WAIT_SECONDS ?? "6");
    let seconds = 0.02;

    for (const node of graph.nodes ?? []) {
        const op = graph.declarations?.[node.declaration]?.op;
        if (op === "flow/setDelay" || op === "flow/throttle" || op === "variable/interpolate" || op === "pointer/interpolate") {
            const duration = Number(node.values?.duration?.value?.[0]);
            if (Number.isFinite(duration) && duration > seconds) {
                seconds = duration + 0.35;
            }
        }
    }

    return Math.min(seconds, maxWait);
}

function valuesEqual(actual: unknown[] | undefined, expected: unknown[], typeName: string): boolean {
    if (!actual || actual.length !== expected.length) {
        return false;
    }

    return expected.every((expectedValue, index) => {
        const actualValue = actual[index];
        if (typeName.startsWith("float")) {
            if (isNaNLike(expectedValue)) {
                return isNaNLike(actualValue);
            }
            if (isPositiveInfinityLike(expectedValue)) {
                return Number(actualValue) === Infinity;
            }
            if (isNegativeInfinityLike(expectedValue)) {
                return Number(actualValue) === -Infinity;
            }
            return floatsClose(Number(actualValue), Number(expectedValue));
        }
        return Object.is(actualValue, expectedValue);
    });
}

function floatsClose(actual: number, expected: number): boolean {
    const diff = Math.abs(actual - expected);
    const relativeBase = Math.max(1, Math.abs(expected));
    return diff <= FLOAT_ABSOLUTE_TOLERANCE || diff / relativeBase <= FLOAT_RELATIVE_TOLERANCE;
}

function getSubTestFailure(variables: IInteractivityVariable[], subTest: AssetSubTest): string | undefined {
    const result = variables[subTest.resultVarId]?.value;
    const success = variables[subTest.successResultVarId]?.value?.[0];
    if (valuesEqual(result, subTest.expectedResultValue, subTest.resultVarType) && success === true) {
        return undefined;
    }
    return `expected ${formatTestValue(subTest.expectedResultValue)} and success=true, got result=${formatTestValue(result)} success=${formatTestValue(success)}`;
}

function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

function isNaNLike(value: unknown): boolean {
    return value === "NaN" || Number.isNaN(Number(value));
}

function isPositiveInfinityLike(value: unknown): boolean {
    return value === "Infinity" || Number(value) === Infinity;
}

function isNegativeInfinityLike(value: unknown): boolean {
    return value === "-Infinity" || Number(value) === -Infinity;
}

function formatTestValue(value: unknown): string {
    return JSON.stringify(value, (_key, innerValue) => {
        if (typeof innerValue === "number" && !Number.isFinite(innerValue)) {
            return String(innerValue);
        }
        return innerValue;
    }) ?? "undefined";
}

function structuredCloneFallback<T>(value: T): T {
    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}
