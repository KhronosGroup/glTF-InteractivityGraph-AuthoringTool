import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const gltfRoot = path.join(repoRoot, "third_party", "glTF");
const outputPath = path.join(repoRoot, "src", "objectModel", "generated", "glTFSchemaMetadata.ts");

if (!fs.existsSync(gltfRoot)) {
    throw new Error("Missing third_party/glTF submodule. Run `git submodule update --init --recursive`.");
}

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const posixPath = (filePath) => filePath.split(path.sep).join("/");

const git = (...args) => execFileSync("git", ["-C", gltfRoot, ...args], { encoding: "utf8" }).trim();
const commit = git("rev-parse", "HEAD");
const branch = git("branch", "--show-current") || "detached";
const ensureRef = (ref, fetchRefspec) => {
    try {
        git("rev-parse", "--verify", ref);
    } catch (_error) {
        git("fetch", "origin", fetchRefspec);
    }
};

const mainRef = "origin/main";
ensureRef(mainRef, "refs/heads/main:refs/remotes/origin/main");
const mainCommit = git("rev-parse", mainRef);

const draftPrSchemas = [
    {
        extension: "KHR_node_selectability",
        ref: "refs/remotes/origin/pr/2422-selectability",
        fetchRefspec: "refs/pull/2422/head:refs/remotes/origin/pr/2422-selectability",
        paths: ["extensions/2.0/Khronos/KHR_node_selectability/schema/node.KHR_node_selectability.schema.json"],
    },
    {
        extension: "KHR_node_hoverability",
        ref: "refs/remotes/origin/pr/2426-hoverability",
        fetchRefspec: "refs/pull/2426/head:refs/remotes/origin/pr/2426-hoverability",
        paths: ["extensions/2.0/Khronos/KHR_node_hoverability/schema/node.KHR_node_hoverability.schema.json"],
    },
];

for (const draftSchema of draftPrSchemas) {
    ensureRef(draftSchema.ref, draftSchema.fetchRefspec);
}

const registryText = git("show", `${mainRef}:extensions/README.md`);
const ratifiedKhronosExtensions = [];
let inRatifiedSection = false;
for (const line of registryText.split(/\r?\n/)) {
    if (/^#{2,3} Ratified Khronos Extensions/.test(line)) {
        inRatifiedSection = true;
        continue;
    }
    if (inRatifiedSection && /^#{2,3} /.test(line)) {
        break;
    }
    const match = line.match(/\* \[(KHR_[^\]]+)\]/);
    if (inRatifiedSection && match) {
        ratifiedKhronosExtensions.push(match[1]);
    }
}

const collectSchemaFiles = (dir, base = dir) => {
    if (!fs.existsSync(dir)) {
        return [];
    }

    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectSchemaFiles(fullPath, base));
        } else if (entry.isFile() && entry.name.endsWith(".schema.json")) {
            files.push({
                absolutePath: fullPath,
                relativePath: posixPath(path.relative(gltfRoot, fullPath)),
                schemaName: path.basename(fullPath),
            });
        }
    }
    return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
};

const collectSchemaFilesFromGit = (ref, dir, extension) => (
    git("ls-tree", "-r", "--name-only", ref, dir)
        .split(/\r?\n/)
        .filter((filePath) => filePath.endsWith(".schema.json"))
        .map((relativePath) => ({
            relativePath,
            schemaName: path.posix.basename(relativePath),
            ref,
            extension,
            schema: JSON.parse(git("show", `${ref}:${relativePath}`)),
        }))
        .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
);

const coreSchemaFiles = collectSchemaFilesFromGit(mainRef, "specification/2.0/schema");
const ratifiedExtensionSchemaFiles = ratifiedKhronosExtensions.flatMap((extension) => (
    collectSchemaFilesFromGit(mainRef, `extensions/2.0/Khronos/${extension}/schema`, extension)
));
const interactivitySchemaFiles = collectSchemaFiles(path.join(gltfRoot, "extensions", "2.0", "Khronos", "KHR_interactivity", "schema"))
    .map((schemaFile) => ({ ...schemaFile, extension: "KHR_interactivity" }));
const draftPrSchemaFiles = draftPrSchemas.flatMap((draftSchema) => (
    draftSchema.paths.map((relativePath) => ({
        relativePath,
        schemaName: path.posix.basename(relativePath),
        ref: draftSchema.ref,
        extension: draftSchema.extension,
        schema: JSON.parse(git("show", `${draftSchema.ref}:${relativePath}`)),
    }))
));

const readSchema = (schemaFile) => schemaFile.schema ?? readJson(schemaFile.absolutePath);

const collectDefaults = (schema, sourceId, currentPointer = "#") => {
    const defaults = [];
    if (Object.prototype.hasOwnProperty.call(schema, "default")) {
        defaults.push({ sourceId, pointer: currentPointer, value: schema.default });
    }

    if (schema.properties && typeof schema.properties === "object") {
        for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
            defaults.push(...collectDefaults(propertySchema, sourceId, `${currentPointer}/properties/${propertyName}`));
        }
    }

    if (Array.isArray(schema.allOf)) {
        schema.allOf.forEach((subSchema, index) => {
            defaults.push(...collectDefaults(subSchema, sourceId, `${currentPointer}/allOf/${index}`));
        });
    }

    if (schema.items && typeof schema.items === "object") {
        defaults.push(...collectDefaults(schema.items, sourceId, `${currentPointer}/items`));
    }

    return defaults;
};

const summarizeSchemaFile = (schemaFile, kind) => {
    const schema = readSchema(schemaFile);
    const sourceId = schemaFile.relativePath;
    return {
        kind,
        extension: schemaFile.extension,
        path: schemaFile.relativePath,
        ref: schemaFile.ref,
        schemaName: schemaFile.schemaName,
        id: schema.$id,
        title: schema.title,
        defaults: collectDefaults(schema, sourceId),
    };
};

const schemaSources = [
    ...coreSchemaFiles,
    ...ratifiedExtensionSchemaFiles,
    ...interactivitySchemaFiles,
    ...draftPrSchemaFiles,
];
const schemaByPath = new Map(schemaSources.map((schemaFile) => [schemaFile.relativePath, schemaFile]));
const schemaByName = new Map();
for (const schemaFile of schemaSources) {
    if (!schemaByName.has(schemaFile.schemaName)) {
        schemaByName.set(schemaFile.schemaName, schemaFile);
    }
}

const getSchemaAtPointer = (schema, pointer) => {
    if (!pointer || pointer === "#") {
        return schema;
    }
    return pointer
        .replace(/^#\//, "")
        .split("/")
        .filter(Boolean)
        .reduce((current, segment) => current?.[segment.replace(/~1/g, "/").replace(/~0/g, "~")], schema);
};

const resolveRef = (ref, currentSchemaFile) => {
    const [refPath, refPointer = ""] = ref.split("#");
    const currentDir = path.posix.dirname(currentSchemaFile.relativePath);
    const candidatePath = refPath === "" ? currentSchemaFile.relativePath : path.posix.normalize(path.posix.join(currentDir, refPath));
    const schemaFile = schemaByPath.get(candidatePath) ?? schemaByName.get(path.posix.basename(refPath));
    if (!schemaFile) {
        return undefined;
    }
    return {
        schemaFile,
        schema: getSchemaAtPointer(readSchema(schemaFile), `#${refPointer}`),
    };
};

const mergeSchema = (base, next) => ({
    ...base,
    ...next,
    properties: {
        ...(base.properties ?? {}),
        ...(next.properties ?? {}),
    },
});

const dereferenceSchema = (schema, currentSchemaFile, seen = new Set()) => {
    if (!schema) {
        return {};
    }

    let resolved = {};

    if (schema.$ref) {
        const ref = resolveRef(schema.$ref, currentSchemaFile);
        const seenKey = ref && `${ref.schemaFile.relativePath}:${schema.$ref}`;
        if (ref && !seen.has(seenKey)) {
            resolved = mergeSchema(resolved, dereferenceSchema(ref.schema, ref.schemaFile, new Set([...seen, seenKey])));
        }
    }

    if (Array.isArray(schema.allOf)) {
        for (const subSchema of schema.allOf) {
            resolved = mergeSchema(resolved, dereferenceSchema(subSchema, currentSchemaFile, seen));
        }
    }

    return mergeSchema(resolved, schema);
};

const pointerTypeForSchema = (schema) => {
    if (schema.type === "number") {
        return "float";
    }
    if (schema.type === "integer") {
        return "int";
    }
    if (schema.type === "boolean") {
        return "bool";
    }
    if (schema.type === "array") {
        const itemType = Array.isArray(schema.items) ? undefined : schema.items?.type;
        if (itemType !== "number") {
            return undefined;
        }
        if (schema.minItems === schema.maxItems) {
            if (schema.minItems === 2 || schema.minItems === 3 || schema.minItems === 4) {
                return `float${schema.minItems}`;
            }
            if (schema.minItems === 16) {
                return "float4x4";
            }
        }
        return "float[]";
    }
    return undefined;
};

const shouldSkipPointerProperty = (propertyName) => (
    propertyName === "extensions"
    || propertyName === "extras"
    || propertyName === "name"
    || propertyName === "index"
);

const requiredTextureParent = (segments) => {
    const textureIndex = segments.findIndex((segment) => segment.endsWith("Texture"));
    return textureIndex === -1 || textureIndex === segments.length - 1
        ? undefined
        : segments.slice(0, textureIndex + 1);
};

const collectPointerDefinitions = (schema, schemaFile, baseTemplate, baseSegments, options, propertyPath = []) => {
    const resolvedSchema = dereferenceSchema(schema, schemaFile);
    const pointers = [];

    for (const [propertyName, propertySchema] of Object.entries(resolvedSchema.properties ?? {})) {
        if (shouldSkipPointerProperty(propertyName)) {
            continue;
        }

        const resolvedProperty = dereferenceSchema(propertySchema, schemaFile);
        const typeName = pointerTypeForSchema(resolvedProperty);
        const pointerSegments = [...baseSegments, ...propertyPath, propertyName];
        const propertySegments = [...propertyPath, propertyName];
        const template = `${baseTemplate}/${propertySegments.join("/")}`;

        if (typeName) {
            const pointer = {
                template,
                segments: pointerSegments,
                typeName,
                readOnly: options.readOnly?.(propertySegments) ?? false,
                schemaPointer: `${schemaFile.relativePath}#/properties/${[...propertyPath, propertyName].join("/properties/")}`,
            };
            const requiredParentSegments = requiredTextureParent(pointerSegments);
            if (requiredParentSegments) {
                pointer.requiredParentSegments = requiredParentSegments;
            }
            if (Object.prototype.hasOwnProperty.call(resolvedProperty, "default")) {
                pointer.defaultValue = resolvedProperty.default;
            }
            if (options.extension) {
                pointer.extension = options.extension;
            }
            pointers.push(pointer);
            continue;
        }

        pointers.push(...collectPointerDefinitions(
            resolvedProperty,
            schemaFile,
            baseTemplate,
            baseSegments,
            options,
            propertySegments
        ));
    }

    return pointers;
};

const materialPointers = [
    ...collectPointerDefinitions(
        readSchema(schemaByName.get("material.schema.json")),
        schemaByName.get("material.schema.json"),
        "/materials/{}",
        [],
        {
            readOnly: (segments) => segments.join("/") === "doubleSided",
        }
    ),
    ...ratifiedExtensionSchemaFiles
        .filter((schemaFile) => /^material\.KHR_materials_.*\.schema\.json$/.test(schemaFile.schemaName) || /^glTF\.KHR_materials_.*\.schema\.json$/.test(schemaFile.schemaName))
        .flatMap((schemaFile) => collectPointerDefinitions(
            readSchema(schemaFile),
            schemaFile,
            `/materials/{}/extensions/${schemaFile.extension}`,
            ["extensions", schemaFile.extension],
            { extension: schemaFile.extension }
        )),
].sort((a, b) => a.template.localeCompare(b.template));

const nodeExtensionPointers = [
    ...ratifiedExtensionSchemaFiles,
    ...draftPrSchemaFiles,
]
    .filter((schemaFile) => /^node\..*\.schema\.json$/.test(schemaFile.schemaName))
    .filter((schemaFile) => ["KHR_node_visibility", "KHR_node_selectability", "KHR_node_hoverability"].includes(schemaFile.extension))
    .flatMap((schemaFile) => collectPointerDefinitions(
        readSchema(schemaFile),
        schemaFile,
        `/nodes/{}/extensions/${schemaFile.extension}`,
        ["extensions", schemaFile.extension],
        { extension: schemaFile.extension }
    ))
    .filter((pointer) => pointer.typeName !== "float[]")
    .sort((a, b) => a.template.localeCompare(b.template));

const pointer = (template, typeName, readOnly = false, schemaPointer = undefined) => ({ template, typeName, readOnly, schemaPointer });
const textureTransformPointers = [
    "normalTexture",
    "occlusionTexture",
    "emissiveTexture",
    "pbrMetallicRoughness/baseColorTexture",
    "pbrMetallicRoughness/metallicRoughnessTexture",
].flatMap((texturePath) => [
    pointer(`/materials/{}/${texturePath}/extensions/KHR_texture_transform/offset`, "float2"),
    pointer(`/materials/{}/${texturePath}/extensions/KHR_texture_transform/scale`, "float2"),
    pointer(`/materials/{}/${texturePath}/extensions/KHR_texture_transform/rotation`, "float"),
]);

const objectModelPointers = dedupePointers([
    pointer("/animations.length", "int", true),
    pointer("/cameras.length", "int", true),
    pointer("/materials.length", "int", true),
    pointer("/meshes.length", "int", true),
    pointer("/nodes.length", "int", true),
    pointer("/scene", "int", true),
    pointer("/scenes.length", "int", true),
    pointer("/skins.length", "int", true),
    pointer("/scenes/[]/nodes.length", "int", true),
    pointer("/scenes/[]/nodes/[]", "ref", true),
    pointer("/nodes/{}/translation", "float3"),
    pointer("/nodes/{}/rotation", "float4"),
    pointer("/nodes/{}/scale", "float3"),
    pointer("/nodes/{}/matrix", "float4x4", true),
    pointer("/nodes/{}/globalMatrix", "float4x4", true),
    pointer("/nodes/{}/children.length", "int", true),
    pointer("/nodes/{}/children/[]", "ref", true),
    pointer("/nodes/{}/mesh", "ref", true),
    pointer("/nodes/{}/camera", "ref", true),
    pointer("/nodes/{}/skin", "ref", true),
    pointer("/nodes/{}/parent", "ref", true),
    pointer("/nodes/{}/weights", "float[]"),
    pointer("/nodes/{}/weights/[]", "float"),
    pointer("/nodes/{}/weights.length", "int", true),
    pointer("/nodes/{}/extensions/KHR_lights_punctual/light", "ref", true),
    pointer("/meshes/{}/primitives.length", "int", true),
    pointer("/meshes/{}/primitives/[]/material", "ref", true),
    pointer("/meshes/{}/weights/[]", "float"),
    pointer("/meshes/{}/weights.length", "int", true),
    pointer("/cameras/{}/perspective/aspectRatio", "float"),
    pointer("/cameras/{}/perspective/yfov", "float"),
    pointer("/cameras/{}/perspective/zfar", "float"),
    pointer("/cameras/{}/perspective/znear", "float"),
    pointer("/cameras/{}/orthographic/xmag", "float"),
    pointer("/cameras/{}/orthographic/ymag", "float"),
    pointer("/cameras/{}/orthographic/zfar", "float"),
    pointer("/cameras/{}/orthographic/znear", "float"),
    pointer("/skins/{}/joints.length", "int", true),
    pointer("/skins/{}/joints/[]", "ref", true),
    pointer("/skins/{}/skeleton", "ref", true),
    pointer("/extensions/KHR_lights_punctual/lights.length", "int", true),
    pointer("/extensions/KHR_lights_punctual/lights/{}/color", "float3"),
    pointer("/extensions/KHR_lights_punctual/lights/{}/intensity", "float"),
    pointer("/extensions/KHR_lights_punctual/lights/{}/range", "float"),
    pointer("/extensions/KHR_lights_punctual/lights/{}/spot/innerConeAngle", "float"),
    pointer("/extensions/KHR_lights_punctual/lights/{}/spot/outerConeAngle", "float"),
    pointer("/animations/{}/extensions/KHR_interactivity/isPlaying", "bool", true),
    pointer("/animations/{}/extensions/KHR_interactivity/minTime", "float", true),
    pointer("/animations/{}/extensions/KHR_interactivity/maxTime", "float", true),
    pointer("/animations/{}/extensions/KHR_interactivity/playhead", "float", true),
    pointer("/animations/{}/extensions/KHR_interactivity/virtualPlayhead", "float", true),
    pointer("/extensions/KHR_interactivity/delays/{}", "ref", true),
    pointer("/extensions/KHR_interactivity/events/{}", "ref", true),
    ...materialPointers,
    ...nodeExtensionPointers,
    ...textureTransformPointers,
].flatMap(expandPointerAddressModes)).sort((a, b) => a.template.localeCompare(b.template));

function expandPointerAddressModes(pointerDefinition) {
    const expanded = [pointerDefinition];
    const indexTemplate = pointerDefinition.template.replace(/\/(animations|cameras|extensions\/KHR_lights_punctual\/lights|materials|meshes|nodes|skins)\/\{\}/g, "/$1/[]");
    if (indexTemplate !== pointerDefinition.template) {
        expanded.push({ ...pointerDefinition, template: indexTemplate });
    }
    return expanded;
}

function dedupePointers(pointers) {
    const byTemplate = new Map();
    for (const pointerDefinition of pointers) {
        byTemplate.set(pointerDefinition.template, pointerDefinition);
    }
    return [...byTemplate.values()];
}

const schemaFiles = [
    ...coreSchemaFiles.map((schemaFile) => summarizeSchemaFile(schemaFile, "core")),
    ...ratifiedExtensionSchemaFiles.map((schemaFile) => summarizeSchemaFile(schemaFile, "ratified-extension")),
    ...interactivitySchemaFiles.map((schemaFile) => summarizeSchemaFile(schemaFile, "interactivity-pr")),
    ...draftPrSchemaFiles.map((schemaFile) => summarizeSchemaFile(schemaFile, "draft-extension-pr")),
];

const defaultBySchemaPointer = {};
for (const schemaFile of schemaFiles) {
    for (const entry of schemaFile.defaults) {
        defaultBySchemaPointer[`${entry.sourceId}${entry.pointer}`] = entry.value;
    }
}

const metadata = {
    generatedAt: new Date(0).toISOString(),
    source: {
        submodulePath: "third_party/glTF",
        branch,
        commit,
        ratifiedRef: mainRef,
        ratifiedCommit: mainCommit,
    },
    ratifiedKhronosExtensions,
    schemaFiles,
    defaultBySchemaPointer,
    materialPointers,
    nodeExtensionPointers,
    objectModelPointers,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
    outputPath,
    `/* eslint-disable */\n`
        + `// Generated by scripts/generate-object-model-schema.mjs. Do not edit by hand.\n`
        + `export const glTFSchemaMetadata = ${JSON.stringify(metadata, null, 2)} as const;\n`,
    "utf8"
);

console.log(`Generated ${path.relative(repoRoot, outputPath)} from ${schemaFiles.length} schema file(s).`);
