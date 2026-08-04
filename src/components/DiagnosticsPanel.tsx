import React, { useContext, useState } from "react";
import { Alert, Badge, Button } from "react-bootstrap";
import { InteractivityGraphContext } from "../InteractivityGraphContext";
import { IGraphDiagnostic } from "../diagnostics";

export const categoryLabel: Record<IGraphDiagnostic["category"], string> = {
    extension: "Extension",
    operation: "Node operation",
    type: "Data type",
    node: "Node validation",
    graph: "Graph structure",
};

export const DiagnosticsPanel: React.FC = () => {
    // the applied graph's issues (load + last Reload/Play), not the in-progress edits — those are
    // reported live by the editor's own counter/node badges instead
    const { appliedDiagnostics: diagnostics } = useContext(InteractivityGraphContext);
    const [collapsed, setCollapsed] = useState(false);

    if (!diagnostics || diagnostics.length === 0) {
        return null;
    }

    const errorCount = diagnostics.filter(d => d.severity === "error").length;
    const warningCount = diagnostics.length - errorCount;

    return (
        <div className={"app-notice"} data-testid={"diagnostics-panel"}>
            <Alert variant={errorCount > 0 ? "danger" : "warning"} style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Alert.Heading style={{ marginBottom: 0, fontSize: "1.1rem" }}>
                        Loaded with issues
                        {errorCount > 0 && (
                            <Badge bg="danger" style={{ marginLeft: 8 }}>{errorCount} error{errorCount > 1 ? "s" : ""}</Badge>
                        )}
                        {warningCount > 0 && (
                            <Badge bg="warning" text="dark" style={{ marginLeft: 8 }}>{warningCount} warning{warningCount > 1 ? "s" : ""}</Badge>
                        )}
                    </Alert.Heading>
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setCollapsed(prev => !prev)}
                    >
                        {collapsed ? "Show details" : "Hide details"}
                    </Button>
                </div>

                {!collapsed && (
                    <ul style={{ marginTop: 12, marginBottom: 0, paddingLeft: 20 }}>
                        {diagnostics.map((diagnostic, index) => (
                            <li key={index} style={{ marginBottom: 8 }}>
                                <Badge
                                    bg={diagnostic.severity === "error" ? "danger" : "warning"}
                                    text={diagnostic.severity === "error" ? undefined : "dark"}
                                    style={{ marginRight: 8 }}
                                >
                                    {categoryLabel[diagnostic.category]}
                                </Badge>
                                {diagnostic.nodeIndex !== undefined && (
                                    <Badge bg="secondary" style={{ marginRight: 8 }}>
                                        Node #{diagnostic.nodeIndex}{diagnostic.nodeOp ? `: ${diagnostic.nodeOp}` : ""}
                                    </Badge>
                                )}
                                <strong>{diagnostic.title}</strong>
                                {diagnostic.detail && (
                                    <div style={{ fontSize: "0.9rem", marginTop: 2 }}>{diagnostic.detail}</div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Alert>
        </div>
    );
};
