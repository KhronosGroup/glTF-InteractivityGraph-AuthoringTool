import React, { useEffect, useRef, useState } from "react";
import { IInteractivityVariable } from "../BasicBehaveEngine/types/InteractivityGraph";
import { getColorForTypeIndex, getTypeLabel } from "./socketColors";

export interface VariablesConfigFieldProps {
    /** all variables declared on the graph; the array index is the variable id */
    variables: IInteractivityVariable[];
    /** ids of the currently selected variables (order preserved) */
    selectedIds: number[];
    /** called with the new list of selected ids whenever the selection changes */
    onChange: (ids: number[]) => void;
}

/**
 * A "nice" multi-select menu for the `variables` configuration of the variable/set node.
 * Selected variables are shown as removable chips (colored by their data type); a dropdown
 * lists every declared variable as a checkbox row so several can be toggled without typing
 * comma-separated ids. Replaces the raw text input the generic config field used to render.
 */
export const VariablesConfigField: React.FC<VariablesConfigFieldProps> = ({ variables, selectedIds, onChange }) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // close the dropdown when clicking outside of it
    useEffect(() => {
        if (!open) { return; }
        const onDocMouseDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [open]);

    const toggle = (id: number) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((existing) => existing !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const remove = (id: number) => onChange(selectedIds.filter((existing) => existing !== id));

    // show the name alongside the id so variables stay identifiable even when unnamed.
    // Loaded KHR_interactivity graphs carry the name in `id`, authored ones in `name`.
    const labelFor = (id: number) => {
        const variable = variables[id] as (IInteractivityVariable & { id?: string }) | undefined;
        const name = variable?.name ?? variable?.id;
        return name ? `${name} (#${id})` : `variable #${id}`;
    };

    return (
        <div className={"vars-config nodrag"} ref={rootRef}>
            <div className={"vars-config-trigger"} onClick={() => setOpen((v) => !v)} title={"Select variables to set"}>
                <div className={"vars-config-chips"}>
                    {selectedIds.length === 0 ? (
                        <span className={"vars-config-placeholder"}>Select variables…</span>
                    ) : (
                        selectedIds.map((id) => (
                            <span key={id} className={"vars-config-chip"}>
                                <span
                                    className={"vars-config-chip-dot"}
                                    style={{ background: getColorForTypeIndex(variables[id]?.type) }}
                                    title={getTypeLabel(variables[id]?.type)}
                                />
                                {labelFor(id)}
                                <span
                                    className={"vars-config-chip-x"}
                                    title={"Remove"}
                                    onClick={(e) => { e.stopPropagation(); remove(id); }}
                                >
                                    ×
                                </span>
                            </span>
                        ))
                    )}
                </div>
                <span className={"vars-config-arrow"}>▾</span>
            </div>

            {open && (
                <div className={"vars-config-menu"}>
                    {variables.length === 0 ? (
                        <div className={"vars-config-empty"}>No variables declared</div>
                    ) : (
                        variables.map((variable, id) => {
                            const checked = selectedIds.includes(id);
                            return (
                                <label key={id} className={"vars-config-option"}>
                                    <input type="checkbox" checked={checked} onChange={() => toggle(id)} />
                                    <span
                                        className={"vars-config-chip-dot"}
                                        style={{ background: getColorForTypeIndex(variable.type) }}
                                    />
                                    <span className={"vars-config-option-name"}>{labelFor(id)}</span>
                                    <span className={"vars-config-option-type"}>{getTypeLabel(variable.type)}</span>
                                </label>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};
