/* eslint-disable @typescript-eslint/no-explicit-any */
export function readAccessorComponents(gltf: any, accessorIndex: number): number[][] {
    const accessor = gltf.accessors?.[accessorIndex];
    const bufferView = gltf.bufferViews?.[accessor?.bufferView];
    const buffers = gltf.__glbBuffers as ArrayBuffer[] | undefined;
    const buffer = buffers?.[bufferView?.buffer ?? 0];
    if (accessor === undefined || bufferView === undefined || buffer === undefined) {
        return [];
    }

    const componentCount = accessorComponentCount(accessor.type);
    const componentByteLength = accessorComponentByteLength(accessor.componentType);
    const byteStride = bufferView.byteStride ?? componentCount * componentByteLength;
    const accessorByteOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const view = new DataView(buffer);
    const values: number[][] = [];

    for (let elementIndex = 0; elementIndex < accessor.count; elementIndex++) {
        const elementOffset = accessorByteOffset + elementIndex * byteStride;
        const element: number[] = [];
        for (let componentIndex = 0; componentIndex < componentCount; componentIndex++) {
            const componentOffset = elementOffset + componentIndex * componentByteLength;
            element.push(readAccessorComponent(view, componentOffset, accessor.componentType, accessor.normalized === true));
        }
        values.push(element);
    }

    applySparseAccessorValues(values, gltf, accessor);
    return values;
}

function applySparseAccessorValues(values: number[][], gltf: any, accessor: any): void {
    const sparse = accessor.sparse;
    if (sparse === undefined || sparse.count === 0) {
        return;
    }
    const indices = readSparseIndices(gltf, sparse);
    const sparseValues = readSparseValues(gltf, sparse, accessor);
    indices.forEach((targetIndex, sparseIndex) => {
        values[targetIndex] = sparseValues[sparseIndex];
    });
}

function readSparseIndices(gltf: any, sparse: any): number[] {
    const bufferView = gltf.bufferViews?.[sparse.indices.bufferView];
    const buffer = (gltf.__glbBuffers as ArrayBuffer[] | undefined)?.[bufferView?.buffer ?? 0];
    if (bufferView === undefined || buffer === undefined) {
        return [];
    }
    const componentByteLength = accessorComponentByteLength(sparse.indices.componentType);
    const byteOffset = (bufferView.byteOffset ?? 0) + (sparse.indices.byteOffset ?? 0);
    const view = new DataView(buffer);
    return new Array(sparse.count).fill(0).map((_value, index) => readAccessorComponent(view, byteOffset + index * componentByteLength, sparse.indices.componentType, false));
}

function readSparseValues(gltf: any, sparse: any, accessor: any): number[][] {
    const bufferView = gltf.bufferViews?.[sparse.values.bufferView];
    const buffer = (gltf.__glbBuffers as ArrayBuffer[] | undefined)?.[bufferView?.buffer ?? 0];
    if (bufferView === undefined || buffer === undefined) {
        return [];
    }
    const componentCount = accessorComponentCount(accessor.type);
    const componentByteLength = accessorComponentByteLength(accessor.componentType);
    const byteStride = bufferView.byteStride ?? componentCount * componentByteLength;
    const byteOffset = (bufferView.byteOffset ?? 0) + (sparse.values.byteOffset ?? 0);
    const view = new DataView(buffer);
    return new Array(sparse.count).fill(0).map((_value, elementIndex) => (
        new Array(componentCount).fill(0).map((_component, componentIndex) => (
            readAccessorComponent(view, byteOffset + elementIndex * byteStride + componentIndex * componentByteLength, accessor.componentType, accessor.normalized === true)
        ))
    ));
}

function accessorComponentCount(type: string): number {
    switch (type) {
        case "SCALAR": return 1;
        case "VEC2": return 2;
        case "VEC3": return 3;
        case "VEC4": return 4;
        case "MAT2": return 4;
        case "MAT3": return 9;
        case "MAT4": return 16;
        default: return 0;
    }
}

function accessorComponentByteLength(componentType: number): number {
    switch (componentType) {
        case 5120:
        case 5121:
            return 1;
        case 5122:
        case 5123:
            return 2;
        case 5125:
        case 5126:
            return 4;
        default:
            return 0;
    }
}

function readAccessorComponent(view: DataView, byteOffset: number, componentType: number, normalized: boolean): number {
    switch (componentType) {
        case 5120: {
            const value = view.getInt8(byteOffset);
            return normalized ? Math.max(value / 127, -1) : value;
        }
        case 5121: {
            const value = view.getUint8(byteOffset);
            return normalized ? value / 255 : value;
        }
        case 5122: {
            const value = view.getInt16(byteOffset, true);
            return normalized ? Math.max(value / 32767, -1) : value;
        }
        case 5123: {
            const value = view.getUint16(byteOffset, true);
            return normalized ? value / 65535 : value;
        }
        case 5125:
            return view.getUint32(byteOffset, true);
        case 5126:
            return view.getFloat32(byteOffset, true);
        default:
            return NaN;
    }
}
