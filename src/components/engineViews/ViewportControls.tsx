import React from "react";
import { IconFrame, IconFullscreen } from "../toolbarIcons";

/**
 * The 3D viewport's counterpart to reactflow's <Controls/>: a vertical icon bar in the bottom-left
 * corner of the pane, same corner and same look, so fit-view and fullscreen sit in the same place
 * whichever half of the app you are looking at.
 *
 * Fullscreen state is owned by the caller (see useFullscreen), because the element that expands is
 * the pane this bar lives in and the fallback class has to go on it.
 */
export const ViewportControls = (props: {
    onFitView: () => void;
    fitDisabled?: boolean;
    fitTestId?: string;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    fullscreenTestId?: string;
}) => (
    <div className={"viewport-controls"}>
        <button
            type="button"
            className="viewport-controls__btn"
            data-testid={props.fitTestId}
            title={"Fit the model in view"}
            aria-label={"Fit view"}
            disabled={props.fitDisabled}
            onClick={props.onFitView}
        >
            <IconFrame/>
        </button>
        <button
            type="button"
            className={`viewport-controls__btn${props.isFullscreen ? " is-active" : ""}`}
            data-testid={props.fullscreenTestId}
            title={props.isFullscreen ? "Exit fullscreen" : "Show the viewport fullscreen"}
            aria-label={"Toggle viewport fullscreen"}
            aria-pressed={props.isFullscreen}
            onClick={props.onToggleFullscreen}
        >
            <IconFullscreen active={props.isFullscreen}/>
        </button>
    </div>
);
