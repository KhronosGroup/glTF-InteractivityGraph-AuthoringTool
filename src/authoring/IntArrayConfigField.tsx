import React, { useState } from "react";

export interface IntArrayConfigFieldProps {
    /** current integer values, in order (e.g. `cases`, `inputFlows` count-derived ids) */
    values: number[];
    /** called with the full updated list whenever an entry is added or removed */
    onChange: (values: number[]) => void;
    placeholder?: string;
}

/**
 * Editable list view for `int[]` configuration properties (e.g. `math/switch` and `flow/switch`'s
 * `cases`). Replaces the raw comma-separated text field: each integer is shown as a removable
 * chip, and typing a number + Enter (or blurring the input) appends it.
 */
export const IntArrayConfigField: React.FC<IntArrayConfigFieldProps> = ({ values, onChange, placeholder }) => {
    const [draft, setDraft] = useState("");

    const commitDraft = () => {
        const trimmed = draft.trim();
        if (trimmed === "") { return; }
        const parsed = parseInt(trimmed, 10);
        setDraft("");
        if (Number.isNaN(parsed) || values.includes(parsed)) { return; }
        onChange([...values, parsed]);
    };

    const remove = (value: number) => onChange(values.filter((v) => v !== value));

    return (
        <div className={"int-arr-config nodrag"}>
            <div className={"int-arr-config-chips"}>
                {values.map((value) => (
                    <span key={value} className={"int-arr-config-chip"}>
                        {value}
                        <span className={"int-arr-config-chip-x"} title={"Remove"} onClick={() => remove(value)}>
                            ×
                        </span>
                    </span>
                ))}
                <input
                    type="number"
                    step={1}
                    className={"int-arr-config-input"}
                    placeholder={placeholder ?? "add…"}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            commitDraft();
                        } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
                            remove(values[values.length - 1]);
                        }
                    }}
                    onBlur={commitDraft}
                />
            </div>
        </div>
    );
};
