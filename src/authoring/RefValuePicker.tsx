import React, { useContext, useEffect, useMemo, useState } from "react";
import { Modal } from "react-bootstrap";
import { InteractivityGraphContext } from "../InteractivityGraphContext";
import { GltfObjectNode, REF_CATEGORIES, RefCategory, isGltfObjectModelEmpty } from "./gltfObjectModel";

export interface RefValuePickerProps {
    show: boolean;
    /** current pointer value (e.g. "/nodes/3"), used to highlight the active selection */
    currentValue?: string;
    /** socket name (e.g. "material") used to preselect the matching category */
    hintSocket?: string;
    onClose: () => void;
    /** called with the selected JSON pointer, e.g. "/materials/2" */
    onSelect: (pointer: string) => void;
}

const rowStyle = (selected: boolean, depth = 0): React.CSSProperties => ({
    padding: "4px 8px",
    paddingLeft: 8 + depth * 16,
    cursor: "pointer",
    borderRadius: 4,
    background: selected ? "#3d5987" : "transparent",
    color: selected ? "white" : "#222",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 6,
});

export const RefValuePicker: React.FC<RefValuePickerProps> = ({ show, currentValue, hintSocket, onClose, onSelect }) => {
    const { gltfObjectModel } = useContext(InteractivityGraphContext);

    // categories that actually have entries in the loaded model
    const availableCategories = useMemo<RefCategory[]>(() => {
        if (!gltfObjectModel) return [];
        return REF_CATEGORIES.filter((category) => gltfObjectModel[category.id].length > 0);
    }, [gltfObjectModel]);

    // preselect the category whose name matches the socket (e.g. "material" -> Materials)
    const hintedCategoryId = useMemo<RefCategory["id"] | null>(() => {
        if (!hintSocket) return null;
        const hint = hintSocket.toLowerCase();
        const match = availableCategories.find((c) => c.id.startsWith(hint) || hint.startsWith(c.id.replace(/s$/, "")));
        return match?.id ?? null;
    }, [hintSocket, availableCategories]);

    const [activeCategoryId, setActiveCategoryId] = useState<RefCategory["id"] | null>(null);

    // when the picker opens, jump to the hinted category
    useEffect(() => {
        if (show) {
            setActiveCategoryId(hintedCategoryId);
        }
    }, [show, hintedCategoryId]);

    const activeCategory = availableCategories.find((c) => c.id === activeCategoryId) ?? availableCategories[0];

    const choose = (pointerPrefix: string, index: number) => {
        onSelect(`${pointerPrefix}/${index}`);
        onClose();
    };

    const renderNodeTree = (nodes: GltfObjectNode[], rootIndices: number[]) => {
        const byIndex = new Map(nodes.map((n) => [n.index, n]));
        const rows: React.ReactNode[] = [];
        const visited = new Set<number>();

        const walk = (nodeIndex: number, depth: number) => {
            if (visited.has(nodeIndex)) return; // guard against malformed cyclic hierarchies
            visited.add(nodeIndex);
            const node = byIndex.get(nodeIndex);
            if (!node) return;
            const pointer = `/nodes/${node.index}`;
            rows.push(
                <div
                    key={node.index}
                    style={rowStyle(currentValue === pointer, depth)}
                    onClick={() => choose("/nodes", node.index)}
                >
                    <span style={{ opacity: 0.6, fontSize: 11 }}>#{node.index}</span>
                    <span>{node.name}</span>
                </div>
            );
            for (const child of node.children) {
                walk(child, depth + 1);
            }
        };

        for (const root of rootIndices) {
            walk(root, 0);
        }
        return rows;
    };

    const renderList = (category: RefCategory) => {
        if (!gltfObjectModel) return null;
        if (category.tree) {
            return renderNodeTree(gltfObjectModel.nodes, gltfObjectModel.rootNodes);
        }
        const objects = gltfObjectModel[category.id];
        return objects.map((object) => {
            const pointer = `${category.pointerPrefix}/${object.index}`;
            return (
                <div
                    key={object.index}
                    style={rowStyle(currentValue === pointer)}
                    onClick={() => choose(category.pointerPrefix, object.index)}
                >
                    <span style={{ opacity: 0.6, fontSize: 11 }}>#{object.index}</span>
                    <span>{object.name}</span>
                </div>
            );
        });
    };

    return (
        <Modal show={show} onHide={onClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title style={{ fontSize: 18 }}>Select object reference</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: 0 }}>
                {isGltfObjectModelEmpty(gltfObjectModel) ? (
                    <div style={{ padding: 24, color: "#777" }}>
                        No model loaded. Load a glb in the viewer to pick object references.
                    </div>
                ) : (
                    <div style={{ display: "flex", height: 420 }}>
                        {/* categories */}
                        <div style={{ width: 180, borderRight: "1px solid #eee", overflowY: "auto", padding: 8 }}>
                            {availableCategories.map((category) => (
                                <div
                                    key={category.id}
                                    onClick={() => setActiveCategoryId(category.id)}
                                    style={{
                                        padding: "8px 10px",
                                        cursor: "pointer",
                                        borderRadius: 6,
                                        marginBottom: 2,
                                        fontWeight: activeCategory?.id === category.id ? 700 : 400,
                                        background: activeCategory?.id === category.id ? "#eef2f8" : "transparent",
                                        display: "flex",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <span>{category.label}</span>
                                    <span style={{ color: "#999", fontSize: 12 }}>{gltfObjectModel![category.id].length}</span>
                                </div>
                            ))}
                        </div>

                        {/* object list / tree */}
                        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
                            {activeCategory && renderList(activeCategory)}
                        </div>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};
