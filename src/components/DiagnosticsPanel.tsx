import React, { useContext, useState } from "react";
import { Alert, Badge, Button } from "react-bootstrap";
import { InteractivityGraphContext } from "../InteractivityGraphContext";
import { IGraphDiagnostic, SPEC_URL, impactInfo } from "../diagnostics";

export const categoryLabel: Record<IGraphDiagnostic["category"], string> = {
    extension: "Extension",
    operation: "Node operation",
    type: "Data type",
    node: "Node validation",
    graph: "Graph structure",
    execution: "Runtime engine",
};

/** "Graph rejected" etc. with the spec rationale as tooltip; empty when the impact is unknown. */
export const ImpactBadge: React.FC<{ diagnostic: IGraphDiagnostic }> = ({ diagnostic }) => {
    if (diagnostic.impact === undefined) { return null; }
    const { label, description } = impactInfo[diagnostic.impact];
    const hard = diagnostic.impact === "assetRejected" || diagnostic.impact === "graphRejected" || diagnostic.impact === "executionStopped";
    const title = diagnostic.specSection ? `${description} (spec: ${diagnostic.specSection})` : description;
    return (
        <Badge bg={hard ? "dark" : "light"} text={hard ? undefined : "dark"} style={{ marginRight: 8, border: "1px solid #999" }} title={title}>
            {label}
        </Badge>
    );
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
                                <ImpactBadge diagnostic={diagnostic}/>
                                <strong>{diagnostic.title}</strong>
                                {diagnostic.detail && (
                                    <div style={{ fontSize: "0.9rem", marginTop: 2 }}>{diagnostic.detail}</div>
                                )}
                                {diagnostic.impact !== undefined && (
                                    <div style={{ fontSize: "0.8rem", marginTop: 2, opacity: 0.8 }}>
                                        {impactInfo[diagnostic.impact].description}
                                        {diagnostic.specSection && (
                                            <> See <a href={SPEC_URL} target="_blank" rel="noreferrer">spec</a>: {diagnostic.specSection}.</>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Alert>
        </div>
    );
};
