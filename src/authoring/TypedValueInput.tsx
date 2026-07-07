import { useState } from "react";
import { InteractivityValueType } from "../BasicBehaveEngine/types/InteractivityGraph";
import { standardTypes } from "../BasicBehaveEngine/types/nodes";
import { RefValuePicker } from "./RefValuePicker";

const VECTOR_MATRIX_LAYOUTS: Partial<Record<InteractivityValueType, { rows: number; cols: number }>> = {
    [InteractivityValueType.FLOAT2]:   { rows: 1, cols: 2 },
    [InteractivityValueType.FLOAT3]:   { rows: 1, cols: 3 },
    [InteractivityValueType.FLOAT4]:   { rows: 1, cols: 4 },
    [InteractivityValueType.FLOAT2X2]: { rows: 2, cols: 2 },
    [InteractivityValueType.FLOAT3X3]: { rows: 3, cols: 3 },
    [InteractivityValueType.FLOAT4X4]: { rows: 4, cols: 4 },
};

const componentLabel = (layout: { rows: number; cols: number }, row: number, col: number): string =>
    layout.rows === 1 ? (["x", "y", "z", "w"][col] ?? `[${col}]`) : `m${row}${col}`;

const refBtnStyle: React.CSSProperties = {
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

export interface BoolSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
}

// checkbox used everywhere a "bool" typed value is edited (node config values,
// socket default values, variable/event defaults).
export const BoolSwitch = ({ checked, onChange, className, style, disabled }: BoolSwitchProps) => (
    <input
        type="checkbox"
        className={["flow-node-control", "nodrag", className].filter(Boolean).join(" ")}
        style={{ width: 18, height: 18, cursor: "pointer", ...style }}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
    />
);

export interface TypedValueInputProps {
    typeIndex: number;
    value: any;
    onChange: (value: any) => void;
}

/**
 * Type-aware value editor. Renders:
 *   bool    → checkbox
 *   int     → integer number input
 *   float   → decimal number input
 *   float2/3/4/…  → grid of per-component number inputs
 *   ref     → text input + object picker button
 *   string  → text input
 */
export const TypedValueInput = ({ typeIndex, value, onChange }: TypedValueInputProps) => {
    const [showRefPicker, setShowRefPicker] = useState(false);
    const signature = standardTypes[typeIndex]?.signature as InteractivityValueType | undefined;
    const vecLayout = signature ? VECTOR_MATRIX_LAYOUTS[signature] : undefined;

    if (signature === InteractivityValueType.BOOLEAN) {
        const checked = Array.isArray(value) ? Boolean(value[0]) : false;
        return <BoolSwitch checked={checked} onChange={(next) => onChange([next])} />;
    }

    if (signature === InteractivityValueType.INT) {
        const num = Array.isArray(value) ? value[0] : undefined;
        return (
            <input
                type="number"
                step={1}
                className={"flow-node-control nodrag"}
                placeholder={"0"}
                value={num !== undefined && !Number.isNaN(num) ? num : ""}
                onChange={(e) => onChange(e.target.value === "" ? undefined : [parseInt(e.target.value, 10)])}
            />
        );
    }

    if (signature === InteractivityValueType.FLOAT) {
        const num = Array.isArray(value) ? value[0] : undefined;
        return (
            <input
                type="number"
                step={"any"}
                className={"flow-node-control nodrag"}
                placeholder={"0.0"}
                value={num !== undefined && !Number.isNaN(num) ? num : ""}
                onChange={(e) => onChange(e.target.value === "" ? undefined : [parseFloat(e.target.value)])}
            />
        );
    }

    if (vecLayout) {
        return (
            <div
                className={"flow-node-vec-grid"}
                style={{ display: "grid", gridTemplateColumns: `repeat(${vecLayout.cols}, 1fr)`, gap: 4 }}
            >
                {Array.from({ length: vecLayout.rows }).flatMap((_, row) =>
                    Array.from({ length: vecLayout.cols }).map((__, col) => {
                        const idx = col * vecLayout.rows + row;
                        const compVal = Array.isArray(value) ? value[idx] : undefined;
                        return (
                            <input
                                key={idx}
                                type="number"
                                step="any"
                                className={"flow-node-vec-cell nodrag"}
                                title={componentLabel(vecLayout, row, col)}
                                placeholder={componentLabel(vecLayout, row, col)}
                                value={compVal === undefined || (typeof compVal === "number" && Number.isNaN(compVal)) ? "" : compVal}
                                onChange={(e) => {
                                    const arr: number[] = Array.isArray(value) ? [...value] : [];
                                    arr[idx] = e.target.value === "" ? NaN : Number(e.target.value);
                                    onChange(arr);
                                }}
                            />
                        );
                    })
                )}
            </div>
        );
    }

    if (signature === InteractivityValueType.REF) {
        const strVal = Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
        return (
            <div style={{ display: "flex", gap: 4 }}>
                <input
                    className={"flow-node-control nodrag"}
                    style={{ flex: 1, minWidth: 0, fontFamily: "monospace", fontSize: 12 }}
                    placeholder={"/nodes/..."}
                    value={strVal}
                    onChange={(e) => onChange(e.target.value || undefined)}
                />
                <button type="button" style={refBtnStyle} onClick={() => setShowRefPicker(true)} title={"Select an object reference"}>
                    Select…
                </button>
                <RefValuePicker
                    show={showRefPicker}
                    currentValue={strVal || undefined}
                    onClose={() => setShowRefPicker(false)}
                    onSelect={(pointer) => { onChange(pointer); setShowRefPicker(false); }}
                />
            </div>
        );
    }

    // CUSTOM / string / fallback
    const strVal = typeof value === "string" ? value : Array.isArray(value) ? String(value[0] ?? "") : "";
    return (
        <input
            type="text"
            className={"flow-node-control nodrag"}
            placeholder={"value"}
            value={strVal}
            onChange={(e) => onChange(e.target.value || undefined)}
        />
    );
};
