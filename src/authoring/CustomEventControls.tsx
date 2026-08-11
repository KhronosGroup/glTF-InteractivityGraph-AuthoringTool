import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IInteractivityEvent, IInteractivityGraph, InteractivityValueType } from "../BasicBehaveEngine/types/InteractivityGraph";
import { standardTypes } from "./spec/nodes";
import { RefValuePicker } from "./RefValuePicker";
import { TypedValueInput } from "./TypedValueInput";
import "../css/flowNodes.css";

const refSelectButtonStyle: CSSProperties = {
    height: 30,
    border: "1px solid #ccc",
    borderRadius: 6,
    background: "white",
    cursor: "pointer",
    fontSize: 12,
    color: "#333",
    whiteSpace: "nowrap",
    flexShrink: 0,
    padding: "0 8px",
};

// Custom events flow through the global document as CustomEvents named `KHR_INTERACTIVITY:<id>`
// (see DOMEventBus). Both engines (Babylon, Logging) dispatch/listen on this same
// bus, so the authoring nodes can hook it directly without a reference to whichever engine is
// currently running: event/send nodes are monitored by listening, event/receive nodes are
// triggered by dispatching.
const eventChannel = (id: string) => `KHR_INTERACTIVITY:${id}`;

// Pointer-driven event nodes (event/onSelect, event/onHoverIn, event/onHoverOut) fire through
// internal engine callbacks, not the custom-event bus. So the engine nodes additionally dispatch a
// lightweight document event on this channel when they fire (see OnSelect/OnHoverIn/OnHoverOut).
// The detail carries the watched glTF `nodeIndex` so a monitor can filter to its own configured node.
// NOTE: this string is duplicated in the engine node classes; keep both in sync.
const pointerNodeEventChannel = (op: string) => `AUTHORING_NODE_EVENT:${op}`;

const getEventTypeLabel = (typeIndex: number): string =>
    standardTypes[typeIndex]?.name ?? standardTypes[typeIndex]?.signature ?? String(typeIndex);

const formatTime = (t: number): string => {
    const d = new Date(t);
    const pad = (n: number, w = 2) => String(n).padStart(w, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

const formatDetail = (detail: any): string => {
    if (detail == null || typeof detail !== "object") { return ""; }
    try {
        const entries = Object.entries(detail);
        if (entries.length === 0) { return ""; }
        return entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ");
    } catch {
        return "";
    }
};

interface FireLogEntry {
    id: number;      // unique react key
    time: number;    // wall-clock time of the frame flush
    count: number;   // number of fires aggregated into this frame
    detail: string;  // rendered args of the last fire in the frame
}

// cap the on-node log so a long-running graph can't grow it without bound
const MAX_LOG_ENTRIES = 40;

interface FireLogOptions {
    // ignore events whose detail doesn't match (e.g. a different watched nodeIndex)
    accept?: (detail: any) => boolean;
    // how to render an event's detail into the log line
    format?: (detail: any) => string;
}

/**
 * Subscribe to a document event channel and build a newest-first fire chronology of when it fired.
 *
 * Spam handling: an event node can fire many times per frame (e.g. inside a loop, or rapid hover).
 * Rather than logging/rendering each dispatch, fires are counted into a per-frame accumulator and
 * flushed once per animation frame into a single aggregated entry ("×N"), keeping the UI responsive
 * under bursts.
 */
const useFireLog = (channel: string, opts?: FireLogOptions) => {
    const [log, setLog] = useState<FireLogEntry[]>([]);
    const [total, setTotal] = useState(0);

    // per-frame accumulators live in refs so an individual fire doesn't trigger a render
    const frameCountRef = useRef(0);
    const lastDetailRef = useRef("");
    const rafRef = useRef<number | null>(null);
    const nextIdRef = useRef(0);

    // keep the latest accept/format without re-subscribing every render
    const acceptRef = useRef(opts?.accept);
    const formatRef = useRef(opts?.format);
    acceptRef.current = opts?.accept;
    formatRef.current = opts?.format;

    useEffect(() => {
        // reset when the tracked channel changes
        setLog([]);
        setTotal(0);
        frameCountRef.current = 0;
        lastDetailRef.current = "";

        const flush = () => {
            rafRef.current = null;
            const count = frameCountRef.current;
            if (count === 0) { return; }
            frameCountRef.current = 0;
            const entry: FireLogEntry = {
                id: nextIdRef.current++,
                time: Date.now(),
                count,
                detail: lastDetailRef.current,
            };
            setLog((prev) => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
            setTotal((prev) => prev + count);
        };

        const listener = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (acceptRef.current && !acceptRef.current(detail)) { return; }
            // a burst of fires within one frame collapses into a single aggregated log entry
            frameCountRef.current += 1;
            lastDetailRef.current = (formatRef.current ?? formatDetail)(detail);
            if (rafRef.current === null) {
                rafRef.current = requestAnimationFrame(flush);
            }
        };

        document.addEventListener(channel, listener as EventListener);
        return () => {
            document.removeEventListener(channel, listener as EventListener);
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [channel]);

    const clear = useCallback(() => { setLog([]); setTotal(0); }, []);

    return { log, total, clear };
};

// presentational fire log: live dot + total counter + clear button + newest-first entries
const FireLogView = (props: { log: FireLogEntry[]; total: number; clear: () => void }) => (
    <div className={"flow-node-event-monitor nodrag"}>
        <div className={"flow-node-event-monitor-head"}>
            {/* keying the dot by the newest entry re-triggers its flash animation each frame */}
            <span key={props.log[0]?.id ?? "idle"} className={`flow-node-event-dot${props.log.length > 0 ? " is-live" : ""}`} />
            <span className={"flow-node-event-monitor-title"}>fired ×{props.total}</span>
            <button type="button" className={"flow-node-event-clear"} onClick={props.clear} disabled={props.log.length === 0} title={"Clear log"}>clear</button>
        </div>
        <div className={"flow-node-event-log nowheel"}>
            {props.log.length === 0 ? (
                <div className={"flow-node-event-log-empty"}>waiting for events…</div>
            ) : (
                props.log.map((entry) => (
                    <div key={entry.id} className={"flow-node-event-log-row"}>
                        <span className={"flow-node-event-log-time"}>{formatTime(entry.time)}</span>
                        {entry.count > 1 && <span className={"flow-node-event-log-count"}>×{entry.count}</span>}
                        {entry.detail && <span className={"flow-node-event-log-detail"} title={entry.detail}>{entry.detail}</span>}
                    </div>
                ))
            )}
        </div>
    </div>
);

/**
 * Live fire chronology for an event/send ("trigger") node. Subscribes to the configured custom
 * event on the document bus and renders when it fired.
 */
export const CustomEventSendMonitor = (props: { event: IInteractivityEvent }) => {
    const { log, total, clear } = useFireLog(eventChannel(props.event.id));
    return <FireLogView log={log} total={total} clear={clear} />;
};

/**
 * Live fire chronology for a pointer-driven event node (event/onSelect, event/onHoverIn,
 * event/onHoverOut). Listens for the engine's per-op document event and filters to fires whose
 * watched glTF nodeIndex matches this node's configuration (undefined config == the engine's -1
 * default), so each node logs only its own hits.
 */
export const PointerEventMonitor = (props: { op: string; nodeIndex: number }) => {
    const { op, nodeIndex } = props;
    const accept = useCallback((detail: any) => Number(detail?.nodeIndex ?? -1) === nodeIndex, [nodeIndex]);
    // the nodeIndex is implied by the node itself, so drop it from the rendered detail
    const format = useCallback((detail: any) => {
        if (detail == null || typeof detail !== "object") { return ""; }
        const { nodeIndex: _omit, ...rest } = detail;
        return formatDetail(rest);
    }, []);
    const { log, total, clear } = useFireLog(pointerNodeEventChannel(op), { accept, format });
    return <FireLogView log={log} total={total} clear={clear} />;
};

/**
 * Instrument a running engine so pointer-driven event nodes (event/onSelect, event/onHoverIn,
 * event/onHoverOut) notify the authoring UI when they fire — without modifying the engine itself.
 *
 * The engine registers a per-node callback for each watched glTF node in its public
 * `selectableNodesIndices` / `hoverableNodesIndices` maps (keyed by the node's resolved watched
 * index, after the engine's parent walk). We wrap those callbacks so they also dispatch a document
 * event that PointerEventMonitor listens for, then delegate to the original. Because loadBehaveGraph
 * rebuilds these maps on every (re)play, we re-instrument by wrapping loadBehaveGraph on the engine
 * instance. Call once, right after the engine (decorator) is created.
 */
export const attachPointerEventLogging = (engine: any): void => {
    if (!engine || engine.__pointerEventLoggingAttached) { return; }
    engine.__pointerEventLoggingAttached = true;

    const dispatch = (op: string, detail: Record<string, any>) =>
        document.dispatchEvent(new CustomEvent(pointerNodeEventChannel(op), { detail }));

    const instrument = () => {
        // the maps live on the BasicBehaveEngine core, reached through the decorator's behaveEngine field
        const core = engine.behaveEngine ?? engine;
        const selectable: Map<number, any> | undefined = core.selectableNodesIndices;
        const hoverable: Map<number, any> | undefined = core.hoverableNodesIndices;

        selectable?.forEach((cb: any, index: number) => {
            if (!cb || cb.__pelWrapped) { return; }
            const wrapped = (ref: any, controllerIndex: number, selectionPoint: any, selectionRayOrigin: any) => {
                dispatch("event/onSelect", { nodeIndex: index, controllerIndex, selectionPoint: selectionPoint ?? null, selectionRayOrigin: selectionRayOrigin ?? null });
                return cb(ref, controllerIndex, selectionPoint, selectionRayOrigin);
            };
            wrapped.__pelWrapped = true;
            selectable.set(index, wrapped);
        });

        hoverable?.forEach((info: any, index: number) => {
            if (info?.callbackHoverIn && !info.callbackHoverIn.__pelWrapped) {
                const cb = info.callbackHoverIn;
                const wrapped = (ref: any, controllerIndex: number, firstCommon: any) => {
                    dispatch("event/onHoverIn", { nodeIndex: index, controllerIndex });
                    return cb(ref, controllerIndex, firstCommon);
                };
                wrapped.__pelWrapped = true;
                info.callbackHoverIn = wrapped;
            }
            if (info?.callbackHoverOut && !info.callbackHoverOut.__pelWrapped) {
                const cb = info.callbackHoverOut;
                const wrapped = (ref: any, controllerIndex: number, firstCommon: any) => {
                    dispatch("event/onHoverOut", { nodeIndex: index, controllerIndex });
                    return cb(ref, controllerIndex, firstCommon);
                };
                wrapped.__pelWrapped = true;
                info.callbackHoverOut = wrapped;
            }
        });
    };

    const originalLoad = engine.loadBehaveGraph?.bind(engine);
    if (originalLoad) {
        engine.loadBehaveGraph = (behaveGraph: any, runGraph = true) => {
            originalLoad(behaveGraph, runGraph);
            instrument();
        };
    }
    instrument(); // in case a graph was already loaded before attaching
};

// how many components each vector/matrix type carries, used to pad a partially filled grid
const COMPONENT_COUNTS: Record<string, number> = {
    float2: 2, float3: 3, float4: 4,
    float2x2: 4, float3x3: 9, float4x4: 16,
};

/**
 * Turn the edited (typed) argument value into the detail the event/receive node expects:
 * it runs each value through its own parseType, which JSON-parses booleans and vectors and
 * Number()s scalars. Unset components fall back to 0 / false so a partially filled grid still
 * sends a well-formed value.
 */
const serializeArg = (typeIndex: number, raw: any): any => {
    const signature = standardTypes[typeIndex]?.signature ?? "";
    const componentCount = COMPONENT_COUNTS[signature];
    if (componentCount !== undefined) {
        return Array.from({ length: componentCount }, (_, i) => {
            const v = Array.isArray(raw) ? Number(raw[i]) : NaN;
            return Number.isFinite(v) ? v : 0;
        });
    }
    switch (signature) {
        case InteractivityValueType.BOOLEAN:
            return Array.isArray(raw) && raw[0] === true ? "true" : "false";
        case InteractivityValueType.INT:
        case InteractivityValueType.FLOAT: {
            const v = Array.isArray(raw) ? Number(raw[0]) : NaN;
            return Number.isFinite(v) ? v : 0;
        }
        // ref (and anything unrecognised) is sent as the raw string it was edited as
        default:
            return typeof raw === "string" ? raw : Array.isArray(raw) ? String(raw[0] ?? "") : "";
    }
};

/**
 * Manual trigger UI for an event/receive node. Renders a type-specific editor per event argument
 * (the same TypedValueInput used for socket/variable defaults, so a float3 gets three component
 * fields, a bool a checkbox, …) and a button that dispatches the custom event onto the document
 * bus, driving any running graph's receive node.
 *
 * Values are serialized per type into the event detail; the event/receive engine node then parses
 * each one according to its declared type.
 */
export const CustomEventReceiveTrigger = (props: { event: IInteractivityEvent; disabled?: boolean }) => {
    const channel = eventChannel(props.event.id);
    const valueEntries = Object.entries(props.event.values || {});
    // per-argument edit state, in TypedValueInput's shape: an array of components (ref: a string)
    const [args, setArgs] = useState<Record<string, any>>({});
    const [flash, setFlash] = useState(false);
    // which ref argument currently has the object picker open (null = closed)
    const [refPickerArg, setRefPickerArg] = useState<string | null>(null);

    // start from the values declared on the event itself, so its defaults are visible (and aren't
    // silently replaced by zeros on trigger); reset when the target event changes
    const declaredValues = props.event.values;
    const defaultArgs = useMemo(() => {
        const initial: Record<string, any> = {};
        for (const [key, value] of Object.entries(declaredValues || {})) {
            if (value.value === undefined) { continue; }
            initial[key] = standardTypes[value.type]?.signature === InteractivityValueType.REF
                ? String((value.value as any[])[0] ?? "")
                : value.value;
        }
        return initial;
    }, [declaredValues]);
    useEffect(() => { setArgs(defaultArgs); setRefPickerArg(null); }, [channel, defaultArgs]);

    const trigger = useCallback(() => {
        const detail: Record<string, any> = {};
        for (const [key, value] of valueEntries) {
            detail[key] = serializeArg(value.type, args[key]);
        }
        document.dispatchEvent(new CustomEvent(channel, { detail }));
        setFlash(true);
        setTimeout(() => setFlash(false), 220);
    }, [channel, valueEntries, args]);

    return (
        <div className={"flow-node-event-trigger nodrag"}>
            {valueEntries.map(([key, value]) => {
                const isRef = standardTypes[value.type]?.signature === InteractivityValueType.REF;
                return (
                    <div key={key} className={"flow-node-field"}>
                        <label htmlFor={isRef ? `trigger-${channel}-${key}` : undefined}>
                            {key}
                            <span className={"flow-node-event-arg-type"}>{getEventTypeLabel(value.type)}</span>
                        </label>
                        {isRef ? (
                            // ref args keep their own picker here (rather than TypedValueInput's) so the
                            // picker can be hinted with the argument name, as ref input sockets are
                            <div style={{ display: "flex", gap: 4 }}>
                                <input
                                    id={`trigger-${channel}-${key}`}
                                    className={"flow-node-control"}
                                    style={{ flex: 1, minWidth: 0, fontFamily: "monospace" }}
                                    placeholder={"/nodes/0"}
                                    value={args[key] ?? ""}
                                    onChange={(e) => setArgs((prev) => ({ ...prev, [key]: e.target.value }))}
                                />
                                <button type="button" onClick={() => setRefPickerArg(key)} style={refSelectButtonStyle} title={"Select an object reference"}>
                                    Select…
                                </button>
                            </div>
                        ) : (
                            // every other type reuses the shared type-specific editor
                            <TypedValueInput
                                typeIndex={value.type}
                                value={args[key]}
                                onChange={(next) => setArgs((prev) => ({ ...prev, [key]: next }))}
                            />
                        )}
                    </div>
                );
            })}
            <button type="button" className={`flow-node-event-trigger-btn${flash ? " is-flash" : ""}`} onClick={trigger} disabled={props.disabled}>
                ⚡ Trigger event
            </button>

            <RefValuePicker
                show={refPickerArg !== null}
                currentValue={refPickerArg ? (args[refPickerArg] ?? "") : undefined}
                hintSocket={refPickerArg ?? undefined}
                onClose={() => setRefPickerArg(null)}
                onSelect={(pointer) => { if (refPickerArg) { setArgs((prev) => ({ ...prev, [refPickerArg]: pointer })); } }}
            />
        </div>
    );
};

/**
 * Count, per custom event, how many event/receive nodes in the graph listen for it. A custom event
 * with zero receivers can still be triggered, but nothing in the graph reacts — the Send panel uses
 * these counts to flag orphan events and disable their trigger.
 *
 * event/receive nodes reference their event by index through configuration.event.value[0] (stored as
 * a string, matching the exported graph format — see tst/testGraphs/customEventsLoop.json).
 */
const countCustomEventReceivers = (graph: IInteractivityGraph): number[] => {
    const counts = (graph.events ?? []).map(() => 0);
    const declarations = graph.declarations ?? [];
    for (const node of graph.nodes ?? []) {
        if (node.declaration == null) { continue; }
        if (declarations[node.declaration]?.op !== "event/receive") { continue; }
        const index = Number(node.configuration?.event?.value?.[0]);
        if (Number.isInteger(index) && index >= 0 && index < counts.length) {
            counts[index] += 1;
        }
    }
    return counts;
};

/**
 * "Send Custom Event" panel for the engine views. Lists every custom event declared in the graph,
 * flags those with no event/receive listener (their trigger is disabled), and — for the selected
 * event — renders a typed input per argument plus a Trigger button (reusing CustomEventReceiveTrigger,
 * which dispatches onto the same document bus the running engine listens on).
 */
export const SendCustomEventPanel = (props: { graph: IInteractivityGraph }) => {
    const events = props.graph.events ?? [];
    const receiverCounts = useMemo(() => countCustomEventReceivers(props.graph), [props.graph]);

    // default to the first event that actually has a receiver, so the panel opens on something useful
    const initialIndex = useMemo(() => {
        const withReceiver = receiverCounts.findIndex((c) => c > 0);
        return withReceiver >= 0 ? withReceiver : 0;
    }, [receiverCounts]);
    const [selected, setSelected] = useState(initialIndex);
    useEffect(() => { setSelected(initialIndex); }, [initialIndex]);

    if (events.length === 0) {
        return <div className={"send-event-empty"}>This graph declares no custom events.</div>;
    }

    const safeSelected = Math.min(selected, events.length - 1);
    const selectedEvent = events[safeSelected];
    const selectedHasReceiver = (receiverCounts[safeSelected] ?? 0) > 0;
    const selectedArgCount = Object.keys(selectedEvent.values || {}).length;

    return (
        <div className={"send-event-panel"}>
            <div className={"send-event-list"}>
                {events.map((ev, i) => {
                    const count = receiverCounts[i] ?? 0;
                    const argCount = Object.keys(ev.values || {}).length;
                    return (
                        <button
                            key={ev.id ?? i}
                            type="button"
                            className={`send-event-item${i === safeSelected ? " is-selected" : ""}${count === 0 ? " is-orphan" : ""}`}
                            onClick={() => setSelected(i)}
                        >
                            <span className={"send-event-item-id"}>{ev.id || `event ${i}`}</span>
                            <span className={"send-event-item-meta"}>
                                <span className={"send-event-arg-count"}>{argCount} arg{argCount === 1 ? "" : "s"}</span>
                                {count > 0 ? (
                                    <span className={"send-event-badge is-ok"}>{count} receiver{count === 1 ? "" : "s"}</span>
                                ) : (
                                    <span className={"send-event-badge is-none"}>no receiver</span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
            <div className={"send-event-detail"}>
                <div className={"send-event-detail-title"}>{selectedEvent.id || `event ${safeSelected}`}</div>
                {selectedHasReceiver ? (
                    <div className={"send-event-status is-ok"}>
                        {receiverCounts[safeSelected]} event/receive node{receiverCounts[safeSelected] === 1 ? "" : "s"} in the graph listen{receiverCounts[safeSelected] === 1 ? "s" : ""} for this event.
                    </div>
                ) : (
                    <div className={"send-event-status is-warn"}>
                        No <code>event/receive</code> node in the graph listens for this event — triggering it will have no effect.
                    </div>
                )}
                {selectedArgCount === 0 && (
                    <div className={"send-event-noargs"}>This event carries no arguments.</div>
                )}
                <CustomEventReceiveTrigger key={selectedEvent.id ?? safeSelected} event={selectedEvent} disabled={!selectedHasReceiver} />
            </div>
        </div>
    );
};
