import { glTFSchemaMetadata } from "../src/objectModel/generated/glTFSchemaMetadata";
import { normalizePointerTemplate } from "../src/authoring/pointerCatalogue";

export interface SchemaPointerDefinition {
    template: string;
    typeName: string;
    readOnly: boolean;
    extension?: string;
    requiredParentSegments?: readonly string[];
}

export function schemaMaterialPointers(materialIndex = 0): Map<string, SchemaPointerDefinition> {
    const pointers = glTFSchemaMetadata.objectModelPointers as readonly SchemaPointerDefinition[];
    const byPath = new Map<string, SchemaPointerDefinition>();
    for (const definition of pointers) {
        if (!definition.template.startsWith("/materials/{}/") && !definition.template.startsWith("/materials/[]/")) {
            continue;
        }
        const path = definition.template.replace(
            /^\/materials\/(?:\{\}|\[\])\//,
            `/materials/${materialIndex}/`,
        );
        byPath.set(path, definition);
    }
    return byPath;
}

export function schemaMaterialPointerTemplates(): Set<string> {
    return new Set([...schemaMaterialPointers().keys()].map(normalizePointerTemplate));
}

export function completeGltfMaterial(): Record<string, unknown> {
    const material: Record<string, any> = {
        pbrMetallicRoughness: {},
        extensions: {},
    };
    const pointers = glTFSchemaMetadata.materialPointers as readonly SchemaPointerDefinition[];
    for (const definition of pointers) {
        if (definition.extension) {
            material.extensions[definition.extension] ??= {};
        }
        if (definition.requiredParentSegments) {
            setObjectPath(material, definition.requiredParentSegments, {
                index: 0,
                extensions: { KHR_texture_transform: {} },
            });
        }
    }
    return material;
}

function setObjectPath(target: Record<string, any>, segments: readonly string[], value: unknown): void {
    let current = target;
    for (const segment of segments.slice(0, -1)) {
        current[segment] ??= {};
        current = current[segment];
    }
    current[segments[segments.length - 1]] = value;
}
