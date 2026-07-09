import { behaveEngineNodeRegistry } from "../src/BasicBehaveEngine/BasicBehaveEngine";
import { interactivityNodeSpecs } from "../src/authoring/spec/nodes";

// Single enforced invariant across the two op lists that must agree on "which ops exist":
//   1. behaveEngineNodeRegistry  - runtime engine core (op -> BehaveEngineNode class)
//   2. interactivityNodeSpecs    - authoring palette / node specs / declaration catalogue
// The literal "one table" is impossible without breaking the one-way Authoring->Engine boundary
// (the runtime class table lives in the engine, the socket/UI specs on the authoring side), so
// consistency is enforced here instead. Any new drift fails a test until an allowlist below is
// consciously updated.

// Authorable ops with no core-engine class because a host decorator registers them:
// ADecorator (rigid bodies) + BabylonDecorator (selection / hover / animation).
const HOST_PROVIDED = new Set([
    "rigid_body/applyImpulse", "rigid_body/applyPointImpulse", "rigid_body/rayCast",
    "event/rigid_body_triggerEntered", "event/rigid_body_triggerExited",
    "event/onSelect", "event/onHoverIn", "event/onHoverOut",
    "animation/start", "animation/stop", "animation/stopAt",
]);

// Authorable ops with NO runtime implementation anywhere yet - documented drift, surfaced rather
// than silently unrunnable. NOTE: "math/rotate2d" is a casing mismatch; the engine registers
// "math/rotate2D" (see ENGINE_ONLY). Left as-is to preserve behavior; fixing it is a separate change.
const KNOWN_GAPS = new Set([
    "math/round", "math/cross",
    "math/combine2x2", "math/combine3x3", "math/extract2x2", "math/extract3x3",
    "math/rotate2d",
]);

// Engine ops intentionally absent from the authoring palette (internal/utility, or missing entry).
const ENGINE_ONLY = new Set([
    "event/stopPropagation", // internal control op, not user-placed
    "math/Tau",              // executable but has no palette entry
    "math/rotate2D",         // executable; palette offers the mis-cased "math/rotate2d" instead
]);

const engineOps = new Set(behaveEngineNodeRegistry.map(([op]) => op));
const specOps = new Set(interactivityNodeSpecs.map((s) => s.op!));

describe("op registry parity", () => {
    it("engine registry has no duplicate op", () => {
        const ops = behaveEngineNodeRegistry.map(([op]) => op);
        expect(ops.length).toBe(new Set(ops).size);
    });

    it("every authorable op is runtime-provided, host-provided, or an explicitly known gap", () => {
        const unaccounted = [...specOps].filter(
            (op) => !engineOps.has(op) && !HOST_PROVIDED.has(op) && !KNOWN_GAPS.has(op),
        );
        expect(unaccounted).toEqual([]);
    });

    it("every engine op is in the palette or an explicitly listed engine-only op", () => {
        const unexpected = [...engineOps].filter((op) => !specOps.has(op) && !ENGINE_ONLY.has(op));
        expect(unexpected).toEqual([]);
    });

    it("allowlists have no stale entries", () => {
        for (const op of HOST_PROVIDED) expect(engineOps.has(op)).toBe(false);
        for (const op of KNOWN_GAPS) expect(engineOps.has(op)).toBe(false);
        for (const op of [...HOST_PROVIDED, ...KNOWN_GAPS]) expect(specOps.has(op)).toBe(true);
        for (const op of ENGINE_ONLY) {
            expect(engineOps.has(op)).toBe(true);
            expect(specOps.has(op)).toBe(false);
        }
    });
});
