import { CSSProperties, useEffect, useRef, useState } from "react";

// Compact caret button that opens a small popover menu. Used on `int` sockets flagged with
// `objectPicker` to offer an "Open Object Menu" entry (which opens the RefValuePicker). Kept generic
// via `items` so more entries can be added later without touching the socket render code.
export interface ObjectMenuDropdownItem {
    label: string;
    onSelect: () => void;
}

export interface ObjectMenuDropdownProps {
    items: ObjectMenuDropdownItem[];
    disabled?: boolean;
    title?: string;
}

const buttonStyle: CSSProperties = {
    height: 30,
    border: "1px solid #ccc",
    borderRadius: 6,
    background: "white",
    cursor: "pointer",
    fontSize: 12,
    color: "#333",
    whiteSpace: "nowrap",
    flexShrink: 0,
    padding: "0 6px",
};

const menuStyle: CSSProperties = {
    position: "absolute",
    top: "calc(100% + 2px)",
    right: 0,
    minWidth: 150,
    background: "white",
    border: "1px solid #ccc",
    borderRadius: 6,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 10,
    overflow: "hidden",
};

const itemStyle: CSSProperties = {
    padding: "6px 10px",
    fontSize: 12,
    color: "#333",
    cursor: "pointer",
    whiteSpace: "nowrap",
};

export const ObjectMenuDropdown = ({ items, disabled, title }: ObjectMenuDropdownProps) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // close on any click/scroll outside the dropdown so it can't linger over the canvas
    useEffect(() => {
        if (!open) { return; }
        const onDocPointerDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocPointerDown);
        return () => document.removeEventListener("mousedown", onDocPointerDown);
    }, [open]);

    return (
        <div ref={rootRef} className={"nodrag"} style={{ position: "relative", flexShrink: 0 }}>
            <button
                type="button"
                disabled={disabled}
                style={buttonStyle}
                title={title ?? "More options"}
                onClick={() => setOpen((v) => !v)}
            >
                ▾
            </button>
            {open && (
                <div style={menuStyle}>
                    {items.map((item, index) => (
                        <div
                            key={index}
                            style={itemStyle}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setOpen(false); item.onSelect(); }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#eef2f8"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "white"; }}
                        >
                            {item.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
