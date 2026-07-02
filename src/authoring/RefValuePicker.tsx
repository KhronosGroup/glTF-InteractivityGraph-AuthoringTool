import React, { useContext, useEffect, useMemo, useState } from "react";
import { Modal } from "react-bootstrap";
import { InteractivityGraphContext } from "../InteractivityGraphContext";
import { RenderIf } from "../components/RenderIf";
import { GltfObjectNode, REF_CATEGORIES, RefCategory, isGltfObjectModelEmpty } from "./gltfObjectModel";

export interface RefValuePickerProps {
    show: boolean;
    /** current pointer value (e.g. "/nodes/3"), used to highlight the active selection */
    currentValue?: string;
    /** socket name (e.g. "material") used to preselect the matching category */
    hintSocket?: string;
    /** when set, restricts the picker to a single category and hides the category sidebar */
    onlyCategoryId?: RefCategory["id"];
    /** modal title, defaults to "Select object reference" */
    title?: string;
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

export const RefValuePicker: React.FC<RefValuePickerProps> = ({ show, currentValue, hintSocket, onlyCategoryId, title, onClose, onSelect }) => {
    const { gltfObjectModel } = useContext(InteractivityGraphContext);

    // categories that actually have entries in the loaded model
    const availableCategories = useMemo<RefCategory[]>(() => {
        if (!gltfObjectModel) return [];
        return REF_CATEGORIES.filter((category) => gltfObjectModel[category.id].length > 0 && (!onlyCategoryId || category.id === onlyCategoryId));
    }, [gltfObjectModel, onlyCategoryId]);

    // preselect the category whose name matches the socket (e.g. "material" -> Materials)
    const hintedCategoryId = useMemo<RefCategory["id"] | null>(() => {
        if (!hintSocket) return null;
        const hint = hintSocket.toLowerCase();
        const match = availableCategories.find((c) => c.id.startsWith(hint) || hint.startsWith(c.id.replace(/s$/, "")));
        return match?.id ?? null;
    }, [hintSocket, availableCategories]);

    const [activeCategoryId, setActiveCategoryId] = useState<RefCategory["id"] | null>(null);
    const [search, setSearch] = useState("");

    // when the picker opens, jump to the hinted category and clear any previous search
    useEffect(() => {
        if (show) {
            setActiveCategoryId(hintedCategoryId);
            setSearch("");
        }
    }, [show, hintedCategoryId]);

    const activeCategory = availableCategories.find((c) => c.id === activeCategoryId) ?? availableCategories[0];

    const choose = (pointerPrefix: string, index: number) => {
        onSelect(`${pointerPrefix}/${index}`);
        onClose();
    };

    const matchesSearch = (name: string, index: number) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return name.toLowerCase().includes(query) || String(index).includes(query);
    };

    const renderNodeTree = (nodes: GltfObjectNode[], rootIndices: number[]) => {
        const byIndex = new Map(nodes.map((n) => [n.index, n]));
        const visited = new Set<number>();
        const filtering = search.trim().length > 0;

        // returns the rows for this node's subtree, or [] to prune branches with no matches
        const buildRows = (nodeIndex: number, depth: number): React.ReactNode[] => {
            if (visited.has(nodeIndex)) return []; // guard against malformed cyclic hierarchies
            visited.add(nodeIndex);
            const node = byIndex.get(nodeIndex);
            if (!node) return [];
            const childRows = node.children.flatMap((child) => buildRows(child, depth + 1));
            if (filtering && !matchesSearch(node.name, node.index) && childRows.length === 0) {
                return []; // neither this node nor any descendant matches
            }
            const pointer = `/nodes/${node.index}`;
            const row = (
                <div
                    key={node.index}
                    style={rowStyle(currentValue === pointer, depth)}
                    onClick={() => choose("/nodes", node.index)}
                >
                    <span style={{ opacity: 0.6, fontSize: 11 }}>#{node.index}</span>
                    <span>{node.name}</span>
                </div>
            );
            return [row, ...childRows];
        };

        return rootIndices.flatMap((root) => buildRows(root, 0));
    };

    const renderList = (category: RefCategory) => {
        if (!gltfObjectModel) return null;
        if (category.tree) {
            const rows = renderNodeTree(gltfObjectModel.nodes, gltfObjectModel.rootNodes);
            return rows.length > 0 ? rows : <div style={{ padding: 8, color: "#999", fontSize: 13 }}>No matches</div>;
        }
        const objects = gltfObjectModel[category.id].filter((object) => matchesSearch(object.name, object.index));
        if (objects.length === 0) {
            return <div style={{ padding: 8, color: "#999", fontSize: 13 }}>No matches</div>;
        }
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
                <Modal.Title style={{ fontSize: 18 }}>{title ?? "Select object reference"}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: 0 }}>
                {isGltfObjectModelEmpty(gltfObjectModel) ? (
                    <div style={{ padding: 24, color: "#777" }}>
                        No model loaded. Load a glb in the viewer to pick object references.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", height: 420 }}>
                        <div style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or index..."
                                autoFocus
                                style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    padding: "6px 8px",
                                    fontSize: 13,
                                    border: "1px solid #ccc",
                                    borderRadius: 4,
                                }}
                            />
                        </div>
                        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
                            {/* categories */}
                            <RenderIf shouldShow={!onlyCategoryId}>
                                <div style={{ width: 180, borderRight: "1px solid #eee", overflowY: "auto", overscrollBehavior: "contain", padding: 8 }}>
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
                            </RenderIf>

                            {/* object list / tree */}
                            <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: 8 }}>
                                {activeCategory && renderList(activeCategory)}
                            </div>
                        </div>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};
