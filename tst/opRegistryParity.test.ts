import { behaveEngineNodeRegistry } from "../src/BasicBehaveEngine/BasicBehaveEngine";
import { interactivityNodeSpecs } from "../src/authoring/spec/nodes";

// Single enforced invariant across the two op lists that must agree on "which ops exist":
//   1. behaveEngineNodeRegistry  - runtime engine core (op -> BehaveEngineNode class)
//   2. interactivityNodeSpecs    - authoring palette / node specs / declaration catalogue
// The literal "one table" is impossible without breaking the one-way Authoring->Engine boundary
// (the runtime class table lives in the engine, the socket/UI specs on the authoring side), so
// consistency is enforced here instead.

// Authorable ops with no core-engine class because a host decorator registers them:
// ADecorator (rigid bodies) + host decorators (selection / hover).
const HOST_PROVIDED = new Set([
    "rigid_body/applyImpulse", "rigid_body/applyPointImpulse", "rigid_body/rayCast",
    "event/rigid_body_triggerEntered", "event/rigid_body_triggerExited",
    "event/onSelect", "event/onHoverIn", "event/onHoverOut",
]);

const engineOps = new Set(behaveEngineNodeRegistry.map(([op]) => op));
const specOps = new Set(interactivityNodeSpecs.map((s) => s.op!));

describe("op registry parity", () => {
    it("engine registry has no duplicate op", () => {
        const ops = behaveEngineNodeRegistry.map(([op]) => op);
        expect(ops.length).toBe(new Set(ops).size);
    });

    it("every authorable op is runtime-provided or host-provided", () => {
        const unaccounted = [...specOps].filter(
            (op) => !engineOps.has(op) && !HOST_PROVIDED.has(op),
        );
        expect(unaccounted).toEqual([]);
    });

    it("every engine op is in the palette", () => {
        const unexpected = [...engineOps].filter((op) => !specOps.has(op));
        expect(unexpected).toEqual([]);
    });

    it("HOST_PROVIDED has no stale entries", () => {
        for (const op of HOST_PROVIDED) {
            expect(engineOps.has(op)).toBe(false);
            expect(specOps.has(op)).toBe(true);
        }
    });
});
