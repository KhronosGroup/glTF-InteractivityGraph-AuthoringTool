import React, { useContext, useSyncExternalStore } from "react";
import { InteractivityGraphContext } from "../InteractivityGraphContext";

/**
 * In-canvas loading status driven by the context `loadingState`. During a chunked graph load the
 * pipeline reports its current phase (`step`) and overall `progress` (0..1); this renders both the
 * active operation and an exact percentage over the graph viewport.
 * Renders nothing while idle.
 *
 * Subscribed via useSyncExternalStore rather than read off the context value, so a progress tick
 * re-renders only this bar and not every other context consumer (see setLoadingState).
 */
export const LoadingProgressBar: React.FC = () => {
    const { subscribeLoadingState, getLoadingState } = useContext(InteractivityGraphContext);
    const loadingState = useSyncExternalStore(subscribeLoadingState, getLoadingState, getLoadingState);

    if (!loadingState || !loadingState.active) {
        return null;
    }

    const pct = Math.max(0, Math.min(1, loadingState.progress)) * 100;

    return (
        <div className="graph-loading-bar" data-testid="graph-loading-bar">
            <div className="graph-loading-bar__header">
                <span className="graph-loading-bar__label">{loadingState.step}</span>
                <span className="graph-loading-bar__percent">{Math.round(pct)}%</span>
            </div>
            <div className="graph-loading-bar__track">
                <div className="graph-loading-bar__fill" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};
