/** Tracks which node instances are NoOpNode, without BehaveEngineNode needing to import NoOp.ts (avoids a circular import, since NoOp.ts extends BehaveEngineNode). */
const noOpNodes = new WeakSet<object>();

export function registerNoOpNode(node: object) {
    noOpNodes.add(node);
}

export function isNoOpNode(node: object): boolean {
    return noOpNodes.has(node);
}
