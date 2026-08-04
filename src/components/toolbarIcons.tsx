import React from "react";

// small stroke-style icons for the panel toolbars, shared by the graph editor and the engine views
// so both bars read as one control set (kept inline to avoid pulling in an icon library);
// viewBox/props mirror the Feather icon set for a consistent stroke weight
export const iconProps = {
    width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};

export const IconVariables = () => (
    <svg {...iconProps}>
        <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
        <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
        <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
);

export const IconCustomEvents = () => (
    <svg {...iconProps}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
);

export const IconJsonView = () => (
    <svg {...iconProps}>
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
);

export const IconNodeTypes = () => (
    <svg {...iconProps}>
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
);

export const IconSearch = () => (
    <svg {...iconProps}>
        <circle cx="11" cy="11" r="7"/>
        <line x1="20" y1="20" x2="16.6" y2="16.6"/>
    </svg>
);

export const IconAddNode = () => (
    <svg {...iconProps}>
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
);

// the graph editor's expand/collapse toggle: diagonal arrows, pointing out to enter fullscreen and
// in to leave. Deliberately not corner brackets — those read as IconFrame ("fit the graph in view").
export const IconFullscreen = (props: { active: boolean }) => props.active ? (
    <svg {...iconProps}>
        <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
        <line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
) : (
    <svg {...iconProps}>
        <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
        <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
);

export const IconFrame = () => (
    <svg {...iconProps}>
        <polyline points="4 9 4 4 9 4"/><polyline points="15 4 20 4 20 9"/>
        <polyline points="20 15 20 20 15 20"/><polyline points="9 20 4 20 4 15"/>
    </svg>
);

export const IconReload = () => (
    <svg {...iconProps}>
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
);

/** filled triangle: the one solid glyph, so Play reads as the primary action of an engine bar */
export const IconPlay = () => (
    <svg {...iconProps} fill="currentColor" strokeWidth={1}>
        <polygon points="6 4 20 12 6 20 6 4"/>
    </svg>
);

export const IconUpload = () => (
    <svg {...iconProps}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 9 12 4 17 9"/><line x1="12" y1="4" x2="12" y2="16"/>
    </svg>
);

export const IconDownload = () => (
    <svg {...iconProps}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 11 12 16 17 11"/><line x1="12" y1="4" x2="12" y2="16"/>
    </svg>
);

export const IconSendEvent = () => (
    <svg {...iconProps}>
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
);

/** Mouse: toggles the input legend under the graph, most of which is mouse gestures. Deliberately
 *  solid rather than stroked like the icons above — it sits in reactflow's control stack next to
 *  the built-in +/-/frame/lock glyphs, which are filled shapes, and a 1.8px stroke reads noticeably
 *  fainter beside them at the stack's 12px glyph size. The scroll wheel is an evenodd hole in the
 *  body rather than a second shape, so it stays crisp when the glyph is scaled down. Body is 14 x 22
 *  viewBox units: the ~2:3 ratio is what makes it read as a mouse — square it off and it becomes a
 *  ball, narrow it and it becomes a pill. */
export const IconLegend = () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 1a7 7 0 0 0-7 7v8a7 7 0 0 0 14 0V8a7 7 0 0 0-7-7zM13.25 6.25a1.25 1.25 0 0 0-2.5 0v2a1.25 1.25 0 0 0 2.5 0z"
        />
    </svg>
);

/** braces: the object-model JSON payload the logging engine runs against */
export const IconJsonFile = () => (
    <svg {...iconProps}>
        <path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1"/>
        <path d="M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1"/>
    </svg>
);
