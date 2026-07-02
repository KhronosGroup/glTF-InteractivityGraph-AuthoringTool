import { useCallback, useEffect, useRef, useState } from "react";
import { IInteractivityEvent } from "../BasicBehaveEngine/types/InteractivityGraph";
import { standardTypes } from "../BasicBehaveEngine/types/nodes";

// Custom events flow through the global document as CustomEvents named `KHR_INTERACTIVITY:<id>`
// (see DOMEventBus). All three engines (Babylon, Three, Logging) dispatch/listen on this same
// bus, so the authoring nodes can hook it directly without a reference to whichever engine is
// currently running: event/send nodes are monitored by listening, event/receive nodes are
// triggered by dispatching.
const eventChannel = (id: string) => `KHR_INTERACTIVITY:${id}`;

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

/**
 * Live fire chronology for an event/send ("trigger") node. Subscribes to the configured custom
 * event on the document bus and renders a newest-first log of when it fired.
 *
 * Spam handling: a send node can fire many times per frame (e.g. inside a loop). Rather than
 * logging/rendering each dispatch, fires are counted into a per-frame accumulator and flushed once
 * per animation frame into a single aggregated entry ("×N"), keeping the UI responsive under bursts.
 */
export const CustomEventSendMonitor = (props: { event: IInteractivityEvent }) => {
    const channel = eventChannel(props.event.id);
    const [log, setLog] = useState<FireLogEntry[]>([]);
    const [total, setTotal] = useState(0);

    // per-frame accumulators live in refs so an individual fire doesn't trigger a render
    const frameCountRef = useRef(0);
    const lastDetailRef = useRef("");
    const rafRef = useRef<number | null>(null);
    const nextIdRef = useRef(0);

    useEffect(() => {
        // reset when the tracked event changes
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
            // a burst of fires within one frame collapses into a single aggregated log entry
            frameCountRef.current += 1;
            lastDetailRef.current = formatDetail((e as CustomEvent).detail);
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

    return (
        <div className={"flow-node-event-monitor nodrag"}>
            <div className={"flow-node-event-monitor-head"}>
                {/* keying the dot by the newest entry re-triggers its flash animation each frame */}
                <span key={log[0]?.id ?? "idle"} className={`flow-node-event-dot${log.length > 0 ? " is-live" : ""}`} />
                <span className={"flow-node-event-monitor-title"}>fired ×{total}</span>
                <button type="button" className={"flow-node-event-clear"} onClick={clear} disabled={log.length === 0} title={"Clear log"}>clear</button>
            </div>
            <div className={"flow-node-event-log"}>
                {log.length === 0 ? (
                    <div className={"flow-node-event-log-empty"}>waiting for events…</div>
                ) : (
                    log.map((entry) => (
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
};

const placeholderForType = (typeIndex: number): string => {
    switch (standardTypes[typeIndex]?.signature) {
        case "bool": return "true / false";
        case "int": return "0";
        case "float": return "0.0";
        case "float2": return "[0, 0]";
        case "float3": return "[0, 0, 0]";
        case "float4": return "[0, 0, 0, 0]";
        default: return "";
    }
};

/**
 * Manual trigger UI for an event/receive node. Renders an input per event argument and a button
 * that dispatches the custom event onto the document bus, driving any running graph's receive node.
 *
 * Raw string values are sent as the event detail; the event/receive engine node parses each value
 * according to its declared type (matching the existing engine "Send Custom Event" modals).
 */
export const CustomEventReceiveTrigger = (props: { event: IInteractivityEvent }) => {
    const channel = eventChannel(props.event.id);
    const valueEntries = Object.entries(props.event.values || {});
    const [args, setArgs] = useState<Record<string, string>>({});
    const [flash, setFlash] = useState(false);

    // clear entered args when the target event changes
    useEffect(() => { setArgs({}); }, [channel]);

    const trigger = useCallback(() => {
        const detail: Record<string, any> = {};
        for (const [key] of valueEntries) {
            detail[key] = args[key] ?? "";
        }
        document.dispatchEvent(new CustomEvent(channel, { detail }));
        setFlash(true);
        setTimeout(() => setFlash(false), 220);
    }, [channel, valueEntries, args]);

    return (
        <div className={"flow-node-event-trigger nodrag"}>
            {valueEntries.map(([key, value]) => (
                <div key={key} className={"flow-node-field"}>
                    <label htmlFor={`trigger-${channel}-${key}`}>
                        {key}
                        <span className={"flow-node-event-arg-type"}>{getEventTypeLabel(value.type)}</span>
                    </label>
                    <input
                        id={`trigger-${channel}-${key}`}
                        className={"flow-node-control"}
                        placeholder={placeholderForType(value.type)}
                        value={args[key] ?? ""}
                        onChange={(e) => setArgs((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                </div>
            ))}
            <button type="button" className={`flow-node-event-trigger-btn${flash ? " is-flash" : ""}`} onClick={trigger}>
                ⚡ Trigger event
            </button>
        </div>
    );
};
