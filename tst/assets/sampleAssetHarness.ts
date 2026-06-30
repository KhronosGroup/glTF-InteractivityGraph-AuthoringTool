import fs from "fs";
import path from "path";
import { ADecorator } from "../../src/BasicBehaveEngine/ADecorator";
import { BasicBehaveEngine } from "../../src/BasicBehaveEngine/BasicBehaveEngine";
import { IEventBus, IEventQueueItem, IInterpolateAction } from "../../src/BasicBehaveEngine/IBehaveEngine";
import { BehaveEngineNode } from "../../src/BasicBehaveEngine/BehaveEngineNode";
import { IInteractivityFlow, IInteractivityVariable } from "../../src/BasicBehaveEngine/types/InteractivityGraph";

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

export const DEFAULT_SAMPLE_ASSETS_ROOT = path.resolve(process.cwd(), "../glTF-Interactivity-Sample-Assets");

export function getSampleAssetsRoot(): string {
    return process.env.KHR_INTERACTIVITY_SAMPLE_ASSETS ?? DEFAULT_SAMPLE_ASSETS_ROOT;
}

export function loadAssetCases(): AssetCase[] {
    const root = path.join(getSampleAssetsRoot(), "Tests", "Interactivity");
    if (!fs.existsSync(root)) {
        throw new Error(`KHR_interactivity sample assets not found at ${root}. Set KHR_INTERACTIVITY_SAMPLE_ASSETS to the repo root.`);
    }

    const nameFilter = process.env.KHR_INTERACTIVITY_ASSET_NAME_FILTER;
    const filter = process.env.KHR_INTERACTIVITY_ASSET_FILTER;
    const limit = Number(process.env.KHR_INTERACTIVITY_ASSET_LIMIT ?? "0");

    return loadAssetEntries(root)
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
    if (bytes.toString("ascii", 0, 4) !== "glTF") {
        throw new Error(`${glbPath} is not a GLB file`);
    }

    let offset = 12;
    while (offset < bytes.length) {
        const chunkLength = bytes.readUInt32LE(offset);
        const chunkType = bytes.toString("ascii", offset + 4, offset + 8);
        if (chunkType === "JSON") {
            const json = bytes.subarray(offset + 8, offset + 8 + chunkLength).toString("utf8").trim();
            return JSON.parse(json);
        }
        offset += 8 + chunkLength;
    }

    throw new Error(`${glbPath} does not contain a JSON chunk`);
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

export class GenericTestDecorator extends ADecorator {
    constructor(behaveEngine: BasicBehaveEngine, public world: any) {
        super(behaveEngine);
        this.behaveEngine.getWorld = this.getWorld;
        this.behaveEngine.getParentNodeIndex = this.getParentNodeIndex;
        this.behaveEngine.resolveRef = this.resolveRef;
        this.registerKnownPointers();
    }

    processNodeStarted = (_node: BehaveEngineNode): void => {};
    processAddingNodeToQueue = (_flow: IInteractivityFlow): void => {};
    processExecutingNextNode = (_flow: IInteractivityFlow): void => {};
    startAnimation = (_animationIndex: number, _startTime: number, _endTime: number, _speed: number, callback: () => void): void => callback();
    stopAnimation = (_animationIndex: number): void => {};
    stopAnimationAt = (_animationIndex: number, _stopTime: number, callback: () => void): void => callback();
    resolveRef = (ref: any): any => {
        if (ref == null || ref === "") {
            return -1;
        }
        return String(ref).split("/").pop();
    };
    getWorld = (): any => this.world;
    getParentNodeIndex = (nodeIndex: number): number | undefined => this.world.parents[nodeIndex];
    registerJsonPointer = (jsonPtr: string, getter: (path: string) => any, setter: (path: string, value: any) => void, typeName: string, readOnly: boolean): void => {
        this.behaveEngine.registerJsonPointer(jsonPtr, getter, setter, typeName, readOnly);
    };

    registerKnownPointers = (): void => {
        const nodeCount = this.world.nodes.length;
        const materialCount = this.world.materials.length;
        const meshCount = this.world.meshes.length;
        const animationCount = this.world.animations.length;
        const lightCount = this.world.lights.length;
        const maxWeights = Math.max(1, ...this.world.nodes.map((node: any) => node.weights?.length ?? 0));
        const maxChildren = Math.max(1, ...this.world.nodes.map((node: any) => node.children?.length ?? 0));
        const maxPrimitiveCount = Math.max(1, ...this.world.meshes.map((mesh: any) => mesh.primitives?.length ?? 0));

        this.pointer("/nodes.length", () => [nodeCount], () => {}, "int", true);
        this.pointer("/materials.length", () => [materialCount], () => {}, "int", true);
        this.pointer("/animations.length", () => [animationCount], () => {}, "int", true);

        this.pointer(`/nodes/${nodeCount}/translation`, (p) => this.node(p).translation, (p, v) => this.node(p).translation = v, "float3");
        this.pointer(`/nodes/${nodeCount}/scale`, (p) => this.node(p).scale, (p, v) => this.node(p).scale = v, "float3");
        this.pointer(`/nodes/${nodeCount}/rotation`, (p) => this.node(p).rotation, (p, v) => this.node(p).rotation = v, "float4");
        this.pointer(`/nodes/${nodeCount}/matrix`, (p) => this.node(p).matrix, () => {}, "float4x4", true);
        this.pointer(`/nodes/${nodeCount}/globalMatrix`, (p) => this.node(p).globalMatrix, () => {}, "float4x4", true);
        this.pointer(`/nodes/${nodeCount}/mesh`, (p) => this.node(p).mesh == null ? [null] : [`/meshes/${this.node(p).mesh}`], () => {}, "ref", true);
        this.pointer(`/nodes/${nodeCount}/children/${maxChildren}`, (p) => {
            const childIndex = this.node(p).children?.[this.part(p, 4)];
            return childIndex == null ? [null] : [`/nodes/${childIndex}`];
        }, () => {}, "ref", true);
        this.pointer(`/nodes/${nodeCount}/weights/${maxWeights}`, (p) => [this.node(p).weights[this.part(p, 4)] ?? 0], (p, v) => this.node(p).weights[this.part(p, 4)] = scalar(v), "float");
        this.pointer(`/nodes/${nodeCount}/extensions/KHR_node_visibility/visible`, (p) => [this.node(p).visible], (p, v) => this.node(p).visible = scalar(v), "bool");
        this.pointer(`/nodes/${nodeCount}/extensions/KHR_node_selectability/selectable`, (p) => [this.node(p).selectable], (p, v) => this.node(p).selectable = scalar(v), "bool");
        this.pointer(`/nodes/${nodeCount}/extensions/KHR_node_hoverability/hoverable`, (p) => [this.node(p).hoverable], (p, v) => this.node(p).hoverable = scalar(v), "bool");

        this.pointer(`/materials/${materialCount}/pbrMetallicRoughness/baseColorFactor`, (p) => this.material(p).baseColorFactor, (p, v) => this.material(p).baseColorFactor = v, "float4");
        this.pointer(`/materials/${materialCount}/pbrMetallicRoughness/roughnessFactor`, (p) => [this.material(p).roughnessFactor], (p, v) => this.material(p).roughnessFactor = scalar(v), "float");
        this.pointer(`/materials/${materialCount}/pbrMetallicRoughness/metallicFactor`, (p) => [this.material(p).metallicFactor], (p, v) => this.material(p).metallicFactor = scalar(v), "float");
        this.pointer(`/materials/${materialCount}/alphaCutoff`, (p) => [this.material(p).alphaCutoff], (p, v) => this.material(p).alphaCutoff = scalar(v), "float");
        this.pointer(`/materials/${materialCount}/emissiveFactor`, (p) => this.material(p).emissiveFactor, (p, v) => this.material(p).emissiveFactor = v, "float3");
        this.pointer(`/materials/${materialCount}/normalTexture/scale`, (p) => [this.material(p).normalTextureScale], (p, v) => this.material(p).normalTextureScale = scalar(v), "float");
        this.pointer(`/materials/${materialCount}/occlusionTexture/strength`, (p) => [this.material(p).occlusionTextureStrength], (p, v) => this.material(p).occlusionTextureStrength = scalar(v), "float");
        this.pointer(`/materials/${materialCount}/extensions/KHR_materials_emissive_strength/emissiveStrength`, (p) => [this.material(p).emissiveStrength], (p, v) => this.material(p).emissiveStrength = scalar(v), "float");
        this.pointer(`/materials/${materialCount}/extensions/KHR_materials_transmission/transmissionFactor`, (p) => [this.material(p).transmissionFactor], (p, v) => this.material(p).transmissionFactor = scalar(v), "float");
        for (const texturePath of ["pbrMetallicRoughness/baseColorTexture", "pbrMetallicRoughness/metallicRoughnessTexture", "normalTexture", "occlusionTexture", "emissiveTexture"]) {
            this.pointer(`/materials/${materialCount}/${texturePath}/extensions/KHR_texture_transform/offset`, (p) => this.textureTransform(p, texturePath).offset, (p, v) => this.textureTransform(p, texturePath).offset = v, "float2");
            this.pointer(`/materials/${materialCount}/${texturePath}/extensions/KHR_texture_transform/scale`, (p) => this.textureTransform(p, texturePath).scale, (p, v) => this.textureTransform(p, texturePath).scale = v, "float2");
            this.pointer(`/materials/${materialCount}/${texturePath}/extensions/KHR_texture_transform/rotation`, (p) => [this.textureTransform(p, texturePath).rotation], (p, v) => this.textureTransform(p, texturePath).rotation = scalar(v), "float");
        }

        this.pointer(`/meshes/${meshCount}/primitives/${maxPrimitiveCount}/material`, (p) => [this.mesh(p).primitives[this.part(p, 4)]?.material ?? -1], (p, v) => this.mesh(p).primitives[this.part(p, 4)].material = scalar(v), "int");

        this.pointer(`/extensions/KHR_lights_punctual/lights/${lightCount}/color`, (p) => this.light(p).color, (p, v) => this.light(p).color = v, "float3");
        this.pointer(`/extensions/KHR_lights_punctual/lights/${lightCount}/intensity`, (p) => [this.light(p).intensity], (p, v) => this.light(p).intensity = scalar(v), "float");
        this.pointer(`/extensions/KHR_lights_punctual/lights/${lightCount}/range`, (p) => [this.light(p).range], (p, v) => this.light(p).range = scalar(v), "float");
        this.pointer(`/extensions/KHR_lights_punctual/lights/${lightCount}/spot/innerConeAngle`, (p) => [this.light(p).spot.innerConeAngle], (p, v) => this.light(p).spot.innerConeAngle = scalar(v), "float");
        this.pointer(`/extensions/KHR_lights_punctual/lights/${lightCount}/spot/outerConeAngle`, (p) => [this.light(p).spot.outerConeAngle], (p, v) => this.light(p).spot.outerConeAngle = scalar(v), "float");

        this.pointer(`/animations/${animationCount}/extensions/KHR_interactivity/playhead`, () => [0], () => {}, "float", true);
        this.pointer(`/animations/${animationCount}/extensions/KHR_interactivity/virtualPlayhead`, () => [0], () => {}, "float", true);
        this.pointer(`/animations/${animationCount}/extensions/KHR_interactivity/minTime`, () => [0], () => {}, "float", true);
        this.pointer(`/animations/${animationCount}/extensions/KHR_interactivity/maxTime`, (p) => [this.animation(p).maxTime], () => {}, "float", true);
        this.pointer(`/animations/${animationCount}/extensions/KHR_interactivity/isPlaying`, () => [false], () => {}, "bool", true);
    };

    private pointer(path: string, getter: (path: string) => any, setter: (path: string, value: any) => void, typeName: string, readOnly = false): void {
        this.registerJsonPointer(path, getter, setter, typeName, readOnly);
    }

    private part(pathValue: string, index: number): number {
        return Number(pathValue.split("/")[index]);
    }

    private node(pathValue: string): any {
        return this.world.nodes[this.part(pathValue, 2)];
    }

    private material(pathValue: string): any {
        return this.world.materials[this.part(pathValue, 2)];
    }

    private mesh(pathValue: string): any {
        return this.world.meshes[this.part(pathValue, 2)];
    }

    private animation(pathValue: string): any {
        return this.world.animations[this.part(pathValue, 2)];
    }

    private light(pathValue: string): any {
        return this.world.lights[this.part(pathValue, 4)];
    }

    private textureTransform(pathValue: string, texturePath: string): any {
        const material = this.material(pathValue);
        material.textureTransforms[texturePath] = material.textureTransforms[texturePath] ?? { offset: [0, 0], scale: [1, 1], rotation: 0 };
        return material.textureTransforms[texturePath];
    }
}

export function createGenericWorldFromGltf(gltf: any): any {
    return {
        nodes: (gltf.nodes ?? []).map((node: any) => ({
            translation: node.translation ?? [0, 0, 0],
            scale: node.scale ?? [1, 1, 1],
            rotation: node.rotation ?? [0, 0, 0, 1],
            matrix: node.matrix ?? identityMatrix(),
            globalMatrix: node.matrix ?? identityMatrix(),
            mesh: node.mesh,
            children: node.children ?? [],
            weights: node.weights ?? [],
            visible: node.extensions?.KHR_node_visibility?.visible ?? true,
            selectable: node.extensions?.KHR_node_selectability?.selectable ?? true,
            hoverable: node.extensions?.KHR_node_hoverability?.hoverable ?? true,
        })),
        parents: buildParentMap(gltf.nodes ?? []),
        materials: (gltf.materials ?? []).map(createGenericMaterial),
        meshes: (gltf.meshes ?? []).map((mesh: any) => ({ primitives: mesh.primitives ?? [] })),
        animations: (gltf.animations ?? []).map((animation: any) => ({ maxTime: animation.samplers?.length ?? 0 })),
        lights: (gltf.extensions?.KHR_lights_punctual?.lights ?? []).map((light: any) => ({
            color: light.color ?? [1, 1, 1],
            intensity: light.intensity ?? 1,
            range: light.range ?? 0,
            spot: {
                innerConeAngle: light.spot?.innerConeAngle ?? 0,
                outerConeAngle: light.spot?.outerConeAngle ?? Math.PI / 4,
            },
        })),
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
            return Math.abs(Number(actualValue) - Number(expectedValue)) <= 0.0001;
        }
        return Object.is(actualValue, expectedValue);
    });
}

function getSubTestFailure(variables: IInteractivityVariable[], subTest: AssetSubTest): string | undefined {
    const result = variables[subTest.resultVarId]?.value;
    const success = variables[subTest.successResultVarId]?.value?.[0];
    if (valuesEqual(result, subTest.expectedResultValue, subTest.resultVarType) && success === true) {
        return undefined;
    }
    return `expected ${JSON.stringify(subTest.expectedResultValue)} and success=true, got result=${JSON.stringify(result)} success=${JSON.stringify(success)}`;
}

function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

function scalar(value: any): any {
    return Array.isArray(value) ? value[0] : value;
}

function isNaNLike(value: unknown): boolean {
    return value === "NaN" || Number.isNaN(Number(value));
}

function identityMatrix(): number[] {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function buildParentMap(nodes: any[]): Record<number, number> {
    const parents: Record<number, number> = {};
    nodes.forEach((node, parentIndex) => {
        for (const childIndex of node.children ?? []) {
            parents[childIndex] = parentIndex;
        }
    });
    return parents;
}

function createGenericMaterial(material: any): any {
    const pbr = material.pbrMetallicRoughness ?? {};
    return {
        baseColorFactor: pbr.baseColorFactor ?? [1, 1, 1, 1],
        roughnessFactor: pbr.roughnessFactor ?? 1,
        metallicFactor: pbr.metallicFactor ?? 1,
        alphaCutoff: material.alphaCutoff ?? 0.5,
        emissiveFactor: material.emissiveFactor ?? [0, 0, 0],
        normalTextureScale: material.normalTexture?.scale ?? 1,
        occlusionTextureStrength: material.occlusionTexture?.strength ?? 1,
        emissiveStrength: material.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1,
        transmissionFactor: material.extensions?.KHR_materials_transmission?.transmissionFactor ?? 0,
        textureTransforms: {},
    };
}

function structuredCloneFallback<T>(value: T): T {
    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}
