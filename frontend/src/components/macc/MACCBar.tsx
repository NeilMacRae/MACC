/**
 * MACCBar — a single SVG rect for one initiative on the MACC chart.
 *
 * The chart coordinate system is:
 *   - x-axis: cumulative abatement (tCO₂e) — left to right
 *   - y-axis: cost per tonne (€/tCO₂e)
 *     - positive costs rendered above the baseline (origin y)
 *     - negative costs rendered below the baseline
 *
 * Props are given in *chart units* (tonnes, €/tonne).  The parent passes
 * scale functions to convert to SVG pixel coordinates.
 */

import type { MACCBar as MACCBarData } from "../../types/initiatives";

interface Props {
  bar: MACCBarData;
  /** d3-scale linear: chart-x (tonnes) → svg-x (px) */
  xScale: (v: number) => number;
  /** d3-scale linear: chart-y (€/tonne) → svg-y (px) */
  yScale: (v: number) => number;
  /** svg-y pixel of the zero baseline */
  yZero: number;
  isSelected: boolean;
  onClick: (id: string) => void;
  onMouseEnter: (bar: MACCBarData, svgX: number, svgY: number) => void;
  onMouseLeave: () => void;
}

// Status → fill colour
const STATUS_COLOUR: Record<string, string> = {
  idea: "#93c5fd",       // blue-300
  planned: "#60a5fa",    // blue-400
  approved: "#3b82f6",   // blue-500
  in_progress: "#2563eb", // blue-600
  completed: "#16a34a",  // green-600
  rejected: "#9ca3af",   // gray-400
};

const AI_FILL = "#a78bfa"; // violet-400

export function MACCBar({
  bar,
  xScale,
  yScale,
  yZero,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const svgX = xScale(bar.x_start);
  const svgWidth = Math.max(xScale(bar.x_end) - xScale(bar.x_start), 1);

  // Positive cost: rect top = yScale(cost_per_tonne), height = yZero - top
  // Negative cost: rect top = yZero, height = yScale(cost_per_tonne) - yZero
  let rectY: number;
  let rectHeight: number;

  if (bar.is_negative_cost) {
    rectY = yZero;
    rectHeight = Math.max(yScale(bar.cost_per_tonne) - yZero, 1);
  } else {
    rectY = yScale(bar.cost_per_tonne);
    rectHeight = Math.max(yZero - rectY, 1);
  }

  const fill =
    bar.initiative_type === "ai_suggested"
      ? AI_FILL
      : (STATUS_COLOUR[bar.status] ?? "#3b82f6");

  const stroke = isSelected ? "#111827" : "rgba(255,255,255,0.4)";
  const strokeWidth = isSelected ? 2 : 0.5;

  return (
    <rect
      x={svgX}
      y={rectY}
      width={svgWidth}
      height={rectHeight}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      style={{ cursor: "pointer", transition: "opacity 0.1s" }}
      opacity={isSelected ? 1 : 0.85}
      onClick={() => onClick(bar.initiative_id)}
      onMouseEnter={(e) => {
        const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
        onMouseEnter(bar, rect.left + rect.width / 2, rect.top);
      }}
      onMouseLeave={onMouseLeave}
      role="button"
      aria-label={`${bar.name}: £${bar.cost_per_tonne.toFixed(0)}/tCO₂e, ${bar.co2e_reduction_annual_tonnes.toFixed(1)} t abatement`}
    />
  );
}
