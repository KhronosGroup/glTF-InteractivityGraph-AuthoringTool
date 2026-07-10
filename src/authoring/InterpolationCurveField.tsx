import React, { useMemo } from "react";

// A control point of the easing curve, [x, y]. The interpolation curve is a cubic bezier
// from the implicit endpoint (0,0) to (1,1) with p1 and p2 as its two control points —
// the same convention as CSS cubic-bezier(x1, y1, x2, y2). The curve's y at normalized time
// gives the factor `c` used by the spec's value blend: (1 - c) * a + c * b.
export type ControlPoint = [number, number];

interface EasingPreset {
    label: string;
    p1: ControlPoint;
    p2: ControlPoint;
}

// Common easing curves as cubic-bezier control points. The In/Out family values match the
// widely used approximations (CSS keywords and easings.net); Back overshoots past [0,1] on y.
export const EASING_PRESETS: EasingPreset[] = [
    { label: "Linear", p1: [0, 0], p2: [1, 1] },
    { label: "Ease", p1: [0.25, 0.1], p2: [0.25, 1] },
    { label: "Ease In", p1: [0.42, 0], p2: [1, 1] },
    { label: "Ease Out", p1: [0, 0], p2: [0.58, 1] },
    { label: "Ease In-Out", p1: [0.42, 0], p2: [0.58, 1] },
    { label: "Sine In", p1: [0.12, 0], p2: [0.39, 0] },
    { label: "Sine Out", p1: [0.61, 1], p2: [0.88, 1] },
    { label: "Sine In-Out", p1: [0.37, 0], p2: [0.63, 1] },
    { label: "Cubic In", p1: [0.32, 0], p2: [0.67, 0] },
    { label: "Cubic Out", p1: [0.33, 1], p2: [0.68, 1] },
    { label: "Cubic In-Out", p1: [0.65, 0], p2: [0.35, 1] },
    { label: "Expo In", p1: [0.7, 0], p2: [0.84, 0] },
    { label: "Expo Out", p1: [0.16, 1], p2: [0.3, 1] },
    { label: "Expo In-Out", p1: [0.87, 0], p2: [0.13, 1] },
    { label: "Back In", p1: [0.36, 0], p2: [0.66, -0.56] },
    { label: "Back Out", p1: [0.34, 1.56], p2: [0.64, 1] },
    { label: "Back In-Out", p1: [0.68, -0.6], p2: [0.32, 1.6] },
];

const SIZE = 150;
const PAD = 18;
const INNER = SIZE - PAD * 2;
const ACCENT = "#3d5987";

const approxEqual = (a: number, b: number) => Math.abs(a - b) < 1e-3;
const pointsEqual = (a: ControlPoint, b: ControlPoint) => approxEqual(a[0], b[0]) && approxEqual(a[1], b[1]);

export interface InterpolationCurveFieldProps {
    /** first control point [x, y]; NaN/undefined components fall back to the linear default (0,0) */
    p1: ControlPoint;
    /** second control point [x, y]; NaN/undefined components fall back to the linear default (1,1) */
    p2: ControlPoint;
    /** apply a preset — sets both control points at once */
    onChange: (p1: ControlPoint, p2: ControlPoint) => void;
}

/**
 * A normalized preview of an interpolation (easing) curve plus a preset picker, shown for
 * pointer/interpolate and variable/interpolate nodes. The curve is the cubic bezier defined by
 * p1 and p2 with implicit endpoints (0,0) and (1,1); the y axis is the blend factor `c` and the
 * x axis is normalized time. Unset control-point components render as the linear default so the
 * preview is always drawable.
 */
export const InterpolationCurveField: React.FC<InterpolationCurveFieldProps> = ({ p1, p2, onChange }) => {
    const cp1: ControlPoint = [Number.isFinite(p1[0]) ? p1[0] : 0, Number.isFinite(p1[1]) ? p1[1] : 0];
    const cp2: ControlPoint = [Number.isFinite(p2[0]) ? p2[0] : 1, Number.isFinite(p2[1]) ? p2[1] : 1];

    const matchedIndex = useMemo(
        () => EASING_PRESETS.findIndex((preset) => pointsEqual(preset.p1, cp1) && pointsEqual(preset.p2, cp2)),
        [cp1[0], cp1[1], cp2[0], cp2[1]]
    );

    // fit the vertical range so overshoot curves (e.g. Back) stay visible; x stays in [0,1]
    const yMin = Math.min(0, cp1[1], cp2[1], 1);
    const yMax = Math.max(0, cp1[1], cp2[1], 1);
    const ySpan = yMax - yMin || 1;
    const toX = (x: number) => PAD + x * INNER;
    const toY = (y: number) => PAD + ((yMax - y) / ySpan) * INNER;

    const curvePath = `M ${toX(0)} ${toY(0)} C ${toX(cp1[0])} ${toY(cp1[1])}, ${toX(cp2[0])} ${toY(cp2[1])}, ${toX(1)} ${toY(1)}`;

    return (
        <div className={"nodrag"} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label htmlFor="easingPreset" style={{ fontSize: 11, color: "#555" }}>curve</label>
                <select
                    id="easingPreset"
                    className={"flow-node-control"}
                    style={{ flex: 1, minWidth: 0 }}
                    value={matchedIndex === -1 ? "custom" : String(matchedIndex)}
                    onChange={(e) => {
                        const preset = EASING_PRESETS[Number(e.target.value)];
                        if (preset) {
                            onChange([...preset.p1], [...preset.p2]);
                        }
                    }}
                >
                    {matchedIndex === -1 && <option value="custom">Custom…</option>}
                    {EASING_PRESETS.map((preset, index) => (
                        <option key={preset.label} value={index}>{preset.label}</option>
                    ))}
                </select>
            </div>

            <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                style={{ background: "#fafafa", border: "1px solid #e2e2e2", borderRadius: 6, alignSelf: "center" }}
            >
                {/* unit box: baseline (c=0) and target (c=1) guides */}
                <rect x={toX(0)} y={toY(1)} width={INNER} height={toY(0) - toY(1)} fill="none" stroke="#e2e2e2" />
                <line x1={toX(0)} y1={toY(0)} x2={toX(1)} y2={toY(1)} stroke="#e8e8e8" strokeDasharray="3 3" />

                {/* control handles */}
                <line x1={toX(0)} y1={toY(0)} x2={toX(cp1[0])} y2={toY(cp1[1])} stroke="#c26" strokeWidth={1} opacity={0.6} />
                <line x1={toX(1)} y1={toY(1)} x2={toX(cp2[0])} y2={toY(cp2[1])} stroke="#c26" strokeWidth={1} opacity={0.6} />

                {/* the easing curve */}
                <path d={curvePath} fill="none" stroke={ACCENT} strokeWidth={2} />

                {/* endpoints and control points */}
                <circle cx={toX(0)} cy={toY(0)} r={3} fill={ACCENT} />
                <circle cx={toX(1)} cy={toY(1)} r={3} fill={ACCENT} />
                <circle cx={toX(cp1[0])} cy={toY(cp1[1])} r={3.5} fill="#c26" />
                <circle cx={toX(cp2[0])} cy={toY(cp2[1])} r={3.5} fill="#c26" />
            </svg>
        </div>
    );
};
