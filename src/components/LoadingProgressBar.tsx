import React, { useContext } from "react";
import { InteractivityGraphContext } from "../InteractivityGraphContext";

/**
 * Thin top-edge progress bar (YouTube-style) driven by the context `loadingState`. During a chunked
 * graph load the pipeline reports its current phase (`step`) and overall `progress` (0..1); this
 * renders a determinate fill so a big graph shows visible advancement instead of a frozen UI.
 * Renders nothing while idle.
 */
export const LoadingProgressBar: React.FC = () => {
    const { loadingState } = useContext(InteractivityGraphContext);

    if (!loadingState || !loadingState.active) {
        return null;
    }

    const pct = Math.max(0, Math.min(1, loadingState.progress)) * 100;

    return (
        <div className="graph-loading-bar" data-testid="graph-loading-bar">
            <div className="graph-loading-bar__fill" style={{ width: `${pct}%` }} />
            <span className="graph-loading-bar__label">{loadingState.step}</span>
        </div>
    );
};
