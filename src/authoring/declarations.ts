import type { IInteractivityDeclaration } from "../BasicBehaveEngine/types/InteractivityGraph";
import type { IGraphDiagnostic } from "../diagnostics";
import { AuthoredGraph, AuthoredNode, AuthoredValue } from "./spec/AuthoredGraph";
import { getNodeSpec, standardTypes, toInteractivityDeclaration } from "./spec/nodes";
import { getExecutableDeclarationIndex } from "./executableGraph";

/** Add an operation declaration if needed and return its index in the current graph. */
export const ensureInteractivityDeclaration = (
    declarations: IInteractivityDeclaration[],
    declaration: IInteractivityDeclaration,
): number => {
    const existingIndex = declarations.findIndex((candidate) => candidate.op === declaration.op);
    if (existingIndex >= 0) {
        return existingIndex;
    }
    declarations.push(declaration);
    return declarations.length - 1;
};

const typeName = (type: number | undefined): string =>
    type === undefined ? "unknown" : (standardTypes[type]?.name ?? `type#${type}`);

/** spec "Unsupported Declarations": how an extension declaration's sockets differ from the op's definition. */
export const describeDeclarationMismatch = (spec: AuthoredNode, declaration: IInteractivityDeclaration): string[] => {
    const differences: string[] = [];
    if (spec.extension !== declaration.extension) {
        differences.push(`"${spec.op}" is defined by "${spec.extension ?? "KHR_interactivity"}", not "${declaration.extension}"`);
    }
    const compare = (direction: string, expected: Record<string, AuthoredValue>, declared: Record<string, { type: number }>) => {
        const missing = Object.keys(expected).filter((key) => declared[key] === undefined);
        const unknown = Object.keys(declared).filter((key) => expected[key] === undefined);
        const mistyped = Object.keys(declared).filter((key) => expected[key] !== undefined && expected[key].type !== declared[key].type);
        if (missing.length > 0) { differences.push(`missing ${direction} sockets: ${missing.map((key) => `${key} (${typeName(expected[key].type)})`).join(", ")}`); }
        if (unknown.length > 0) { differences.push(`unknown ${direction} sockets: ${unknown.join(", ")}`); }
        for (const key of mistyped) { differences.push(`${direction} socket "${key}" is ${typeName(declared[key].type)}, expected ${typeName(expected[key].type)}`); }
    };
    compare("input", spec.values?.input ?? {}, declaration.inputValueSockets ?? {});
    compare("output", spec.values?.output ?? {}, declaration.outputValueSockets ?? {});
    return differences;
};

const declarationOf = (node: AuthoredNode, declarations: IInteractivityDeclaration[]): IInteractivityDeclaration | undefined =>
    declarations[getExecutableDeclarationIndex(node, declarations)];

/**
 * Declaration diagnostics of the authored graph: extension declarations that differ from the op
 * this tool implements, and wires reading output sockets an extension declaration doesn't list
 * (reported on both the reading and the source node).
 */
export const computeDeclarationDiagnostics = (graph: AuthoredGraph): IGraphDiagnostic[] => {
    const declarations = graph.declarations ?? [];
    const diagnostics: IGraphDiagnostic[] = [];
    const indexByUid = new Map<string, number>();
    graph.nodes.forEach((node, index) => { if (node.uid !== undefined) { indexByUid.set(node.uid, index); } });
    // source node index -> undeclared output socket -> reading node indices
    const undeclaredReads = new Map<number, Map<string, number[]>>();
    graph.nodes.forEach((node, index) => {
        const declaration = declarationOf(node, declarations);
        const spec = getNodeSpec(node.op);
        if (declaration?.extension !== undefined && spec !== undefined) {
            const differences = describeDeclarationMismatch(spec, declaration);
            if (differences.length > 0) {
                diagnostics.push({
                    severity: 'warning', category: 'declaration', nodeUid: node.uid, nodeIndex: index, nodeOp: node.op,
                    impact: 'noOp', specSection: 'Unsupported Declarations',
                    title: `Declaration does not match ${spec.extension ?? "KHR_interactivity"}`,
                    detail: `The declaration of "${node.op}": ${differences.join("; ")}. A conforming engine treats this declaration as unsupported and runs its nodes as no-ops; this tool still runs them with the extension's sockets and rewrites the declaration when a changed graph is applied.`,
                });
            }
        }
        for (const [key, link] of Object.entries(node.values?.input ?? {})) {
            if (link.node === undefined) { continue; }
            const sourceIndex = indexByUid.get(String(link.node));
            if (sourceIndex === undefined) { continue; }
            const socket = link.socket ?? "value";
            const sourceDeclaration = declarationOf(graph.nodes[sourceIndex], declarations);
            if (sourceDeclaration?.extension === undefined || sourceDeclaration.outputValueSockets?.[socket] !== undefined) { continue; }
            diagnostics.push({
                severity: 'error', category: 'declaration', nodeUid: node.uid, nodeIndex: index, nodeOp: node.op,
                impact: 'graphRejected', specSection: 'Declarations',
                title: `Undeclared output value socket "${socket}"`,
                detail: `Input "${key}" reads "${socket}" from node ${sourceIndex} ("${sourceDeclaration.op}"), but that node's declaration does not list "${socket}" in its outputValueSockets. Operations of the extension "${sourceDeclaration.extension}" only have the value sockets their declaration defines.`,
            });
            const reads = undeclaredReads.get(sourceIndex) ?? new Map<string, number[]>();
            reads.set(socket, [...(reads.get(socket) ?? []), index]);
            undeclaredReads.set(sourceIndex, reads);
        }
    });
    for (const [sourceIndex, reads] of undeclaredReads) {
        const source = graph.nodes[sourceIndex];
        for (const [socket, readers] of reads) {
            diagnostics.push({
                severity: 'error', category: 'declaration', nodeUid: source.uid, nodeIndex: sourceIndex, nodeOp: source.op,
                impact: 'graphRejected', specSection: 'Declarations',
                title: `Undeclared output value socket "${socket}" is in use`,
                detail: `Node${readers.length > 1 ? "s" : ""} ${readers.join(", ")} read${readers.length > 1 ? "" : "s"} "${socket}", but the declaration of "${source.op}" does not list it in its outputValueSockets.`,
            });
        }
    }
    return diagnostics;
};

// spec: declarations are equal when op, extension and input value sockets match
const declarationKey = (declaration: IInteractivityDeclaration): string =>
    JSON.stringify([
        declaration.op,
        declaration.extension ?? "",
        Object.entries(declaration.inputValueSockets ?? {}).map(([key, socket]) => [key, socket.type]).sort(),
    ]);

/**
 * Rewrite every declaration of an extension op this tool implements from the op's definition, so
 * the graph uses the extension's sockets. Declarations that become equal are merged and node
 * declaration indices remapped. Mutates the nodes; returns the new declarations, or undefined when
 * nothing needed repair.
 */
export const repairExtensionDeclarations = (graph: AuthoredGraph): IInteractivityDeclaration[] | undefined => {
    const declarations = graph.declarations ?? [];
    let repaired = false;
    const candidates = declarations.map((declaration) => {
        const spec = getNodeSpec(declaration.op);
        if (declaration.extension === undefined || spec?.extension !== declaration.extension) { return declaration; }
        if (describeDeclarationMismatch(spec, declaration).length === 0) { return declaration; }
        repaired = true;
        return toInteractivityDeclaration(spec);
    });
    if (!repaired) { return undefined; }
    const next: IInteractivityDeclaration[] = [];
    const indexByKey = new Map<string, number>();
    const remap = candidates.map((declaration) => {
        const key = declarationKey(declaration);
        let index = indexByKey.get(key);
        if (index === undefined) {
            index = next.push(declaration) - 1;
            indexByKey.set(key, index);
        }
        return index;
    });
    for (const node of graph.nodes) {
        const resolved = getExecutableDeclarationIndex(node, declarations);
        if (resolved >= 0) { node.declaration = remap[resolved]; }
    }
    return next;
};
