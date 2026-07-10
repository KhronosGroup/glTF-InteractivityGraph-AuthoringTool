import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { InteractivityValueType } from "../BasicBehaveEngine/types/InteractivityGraph";
import { pointerCatalogue, PointerCategory, isPointerTemplateSupported } from "./pointerCatalogue";
import { getPathTemplateSockets, setPathTemplateSlotKind, PathTemplateSocketKind } from "./pathTemplate";
import { InteractivityGraphContext } from "../InteractivityGraphContext";

export interface PointerConfigFieldProps {
    /** current pointer template string */
    value: string;
    /** read-only pointers are only valid for pointer/get; for set/interpolate they are disabled */
    allowReadOnly: boolean;
    /** called on free-text edit (no type) or catalogue selection (with the entry's type) */
    onChange: (template: string, typeSignature?: InteractivityValueType) => void;
}

const categoryOrder: PointerCategory[] = [
    "Nodes",
    "Meshes",
    "Materials",
    "Material textures",
    "Cameras",
    "Lights",
    "Animations",
    "Scene",
];

export const PointerConfigField: React.FC<PointerConfigFieldProps> = ({ value, allowReadOnly, onChange }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { supportedPointerTemplates } = useContext(InteractivityGraphContext);

    // close the dropdown when clicking outside of it
    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const grouped = useMemo(() => {
        const query = search.trim().toLowerCase();
        const matches = pointerCatalogue.filter((entry) =>
            query === "" ||
            entry.label.toLowerCase().includes(query) ||
            entry.template.toLowerCase().includes(query)
        );
        const byCategory = new Map<PointerCategory, typeof pointerCatalogue>();
        for (const entry of matches) {
            const list = byCategory.get(entry.category) ?? [];
            list.push(entry);
            byCategory.set(entry.category, list);
        }
        return categoryOrder
            .filter((category) => byCategory.has(category))
            .map((category) => ({ category, entries: byCategory.get(category)! }));
    }, [search]);

    const currentSupported = value ? isPointerTemplateSupported(value, supportedPointerTemplates) : true;

    // slots in the current template, so each can be toggled between index and reference input
    const slots = useMemo(() => getPathTemplateSockets(value), [value]);

    const setSlotKind = (slotId: string, kind: PathTemplateSocketKind) => {
        onChange(setPathTemplateSlotKind(value, slotId, kind));
    };

    const segmentButtonStyle = (active: boolean): React.CSSProperties => ({
        background: active ? "#3d5987" : "white",
        color: active ? "white" : "#555",
        border: "none",
        padding: "3px 10px",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: active ? 600 : 400,
    });

    const browseButtonStyle: React.CSSProperties = {
        height: 30,
        minWidth: 34,
        border: "1px solid #ccc",
        borderRadius: 6,
        background: "white",
        cursor: "pointer",
        fontSize: 12,
        color: "#333",
        flexShrink: 0,
    };

    return (
        <div ref={containerRef} style={{ position: "relative" }} className="nodrag">
            <div style={{ display: "flex", gap: 6 }}>
                <input
                    id="pointer"
                    name="pointer"
                    className="flow-node-control"
                    value={value}
                    placeholder="/nodes/[node]/translation"
                    onChange={(e) => onChange(e.target.value)}
                    style={{ flex: 1, minWidth: 0, fontFamily: "monospace", borderColor: currentSupported === false ? "#d98c00" : undefined }}
                    title={currentSupported === false ? "This pointer is not supported by this tool's engine and may not resolve at runtime." : undefined}
                />
                <button
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    title="Browse pointer catalogue"
                    style={browseButtonStyle}
                >
                    ▾
                </button>
            </div>

            {currentSupported === false && value !== "" && (
                <div style={{ color: "#b36b00", fontSize: 11, marginTop: 2 }}>
                    ⚠ Not supported by this tool — may not resolve at runtime.
                </div>
            )}

            {slots.length > 0 && (
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {slots.map((slot) => (
                        <div key={slot.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                            <span style={{ color: "#555", fontFamily: "monospace" }}>{slot.id}</span>
                            <div style={{ display: "inline-flex", border: "1px solid #ccc", borderRadius: 6, overflow: "hidden" }}>
                                <button
                                    type="button"
                                    onClick={() => setSlotKind(slot.id, "index")}
                                    style={segmentButtonStyle(slot.kind === "index")}
                                    title="Index input — an integer socket, e.g. /nodes/3/…"
                                >
                                    index
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSlotKind(slot.id, "ref")}
                                    style={segmentButtonStyle(slot.kind === "ref")}
                                    title="Reference input — a socket wired from a JSON pointer/object reference"
                                >
                                    ref
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {open && (
                <div
                    style={{
                        position: "absolute",
                        zIndex: 10,
                        top: "100%",
                        left: 0,
                        right: 0,
                        maxHeight: 320,
                        overflowY: "auto",
                        overscrollBehavior: "contain",
                        background: "white",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        marginTop: 2,
                    }}
                >
                    <div style={{ position: "sticky", top: 0, background: "white", padding: 6, borderBottom: "1px solid #eee" }}>
                        <input
                            autoFocus
                            className="flow-node-control"
                            value={search}
                            placeholder="Search pointers…"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {grouped.length === 0 && (
                        <div style={{ padding: 8, color: "#888", fontSize: 12 }}>No matching pointers</div>
                    )}
                    {grouped.map(({ category, entries }) => (
                        <div key={category}>
                            <div style={{ padding: "4px 8px", background: "#f3f3f3", fontSize: 11, fontWeight: 700, color: "#555" }}>
                                {category}
                            </div>
                            {entries.map((entry) => {
                                const disabled = entry.readOnly && !allowReadOnly;
                                const entrySupported = isPointerTemplateSupported(entry.template, supportedPointerTemplates);
                                return (
                                    <div
                                        key={entry.template}
                                        onClick={() => {
                                            if (disabled) return;
                                            onChange(entry.template, entry.type);
                                            setOpen(false);
                                            setSearch("");
                                        }}
                                        title={
                                            disabled
                                                ? "Read-only pointer — can only be used with pointer/get"
                                                : entry.template
                                        }
                                        style={{
                                            padding: "5px 8px",
                                            cursor: disabled ? "not-allowed" : "pointer",
                                            opacity: disabled ? 0.45 : 1,
                                            borderBottom: "1px solid #f4f4f4",
                                        }}
                                        onMouseEnter={(e) => { if (!disabled) (e.currentTarget.style.background = "#eef5ff"); }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                                    >
                                        <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                                            <span>{entry.label}</span>
                                            <span style={{ fontSize: 10, color: "#888" }}>{entry.type}</span>
                                            {entry.readOnly && (
                                                <span style={{ fontSize: 10, color: "#888", border: "1px solid #ccc", borderRadius: 3, padding: "0 3px" }}>read-only</span>
                                            )}
                                            {entrySupported === false && (
                                                <span style={{ fontSize: 10, color: "#b36b00", border: "1px solid #e0b070", borderRadius: 3, padding: "0 3px" }}>unsupported</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 10, color: "#999", fontFamily: "monospace" }}>{entry.template}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
