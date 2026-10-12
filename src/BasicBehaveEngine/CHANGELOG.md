# Changelog

All notable changes to `@khronosgroup/gltf-interactivity-engine` are documented here.

## [1.1.0] - 2026-10-12

### API changes
- `IBehaveEngine`: removed `addEntryToValueEvaluationCache` and `getValueEvaluationCacheValue`.
- `IBehaveEngine`: added required `resolveJsonPtr(jsonPtr)` returning an `IJsonPtrEntry`; the other pointer accessors are shorthands for it, so object models override this single lookup.
- The engine now runs on a private copy of the loaded graph; mutating the graph object after `loadBehaveGraph` no longer affects execution.

### Added
- `IBehaveEngine.processDebugLog` (optional) to route `debug/log` output; defaults to the console.
- `IBehaveEngine.setExecutionErrorListener` (optional) to receive runtime errors that stop the event loop.
- `getCustomEventChannel` helper and `IJsonPtrEntry` type.
- `debug/log` message templates and JSON pointer templates are parsed per spec.
- Diagnostics report their spec severity.

### Changed
- Variables and custom events aligned with the KHR_interactivity spec: `IInteractivityEvent.id` and `values` are optional; id-less events are internal-only.
- Top-level graph arrays are optional.
- gl-matrix backed math ops are computed in double precision.
- Faster value evaluation, JSON pointer resolution, custom event delivery and flow node iteration (2–5x overall).
- Prebound standard data edges and synchronous control paths, including branch decision tables, retain custom operation overrides, debug hooks, and live literal edits.

### Fixed
- Spec conformance for `flow/for`, `flow/multiGate`, `flow/throttle`, `flow/switch`, `math/isInf`, `math/smoothStep`, `math/switch`, `math/quatFromAngles`, `animation/stopAt` and `ref/eq`.
- Invalid configurations fall back to the default configuration.
- `flow/setDelay` rejects unrepresentable durations and releases delay ownership.
- `pointer/set` and `pointer/interpolate` activate `err` at runtime for non-writable pointers.
- Inputs with neither value nor node use type-default values; unresolvable ref literals are treated as null.
- Flows to input sockets the target node does not have are ignored.
- Literal inputs are re-parsed when their first element changes in place.

## [1.0.0] - 2026-08-05

- First release on npm as `@khronosgroup/gltf-interactivity-engine`.
