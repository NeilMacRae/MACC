/**
 * MACCChart — D3-powered SVG Marginal Abatement Cost Curve.
 *
 * Uses d3-scale for axis calculations; React renders the SVG.  Variable-width
 * bars represent individual abatement initiatives:
 *   - Width  = co2e_reduction_tonnes (abatement volume on x-axis)
 *   - Height = |cost_per_tonne| (marginal cost on y-axis)
 *   - Bars with negative cost_per_tonne render below the x-axis (cost-saving)
 *
 * Props
 * -----
 * data         — MACCData from /initiatives/macc
 * selectedId   — currently selected initiative id (highlights bar)
 * onSelect     — callback when a bar is clicked
 * width/height — SVG viewport in pixels (default: fill container)
 */

import { useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import type { MACCData, MACCBar as MACCBarData } from "../../types/initiatives";
import { MACCBar } from "./MACCBar";
import { MACCTooltip } from "./MACCTooltip";
import { TargetOverlay } from "./TargetOverlay";

interface TargetOverlayData {
  /** Target label e.g. "2030 — 50%" */
  label: string;
  /**
   * The required abatement volume to reach the target:
   * current_emissions - target_co2e_tonnes (in tCO₂e)
   */
  requiredReductionTonnes: number;
  onTrack: boolean;
  gapTonnes?: number;
}

interface Props {
  data: MACCData;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Optional target overlay lines */
  targets?: TargetOverlayData[];
}

const MARGIN = { top: 20, right: 30, bottom: 50, left: 70 };
const SVG_W = 900;
const SVG_H = 380;
const INNER_W = SVG_W - MARGIN.left - MARGIN.right;
const INNER_H = SVG_H - MARGIN.top - MARGIN.bottom;

function fmtTonnes(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}kt`;
  return `${n.toFixed(0)}t`;
}

function fmtGbp(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(0)}k`;
  return `£${n.toFixed(0)}`;
}

// Status legend
const LEGEND = [
  { label: "Idea", colour: "#93c5fd" },
  { label: "Planned", colour: "#60a5fa" },
  { label: "Approved", colour: "#3b82f6" },
  { label: "In Progress", colour: "#2563eb" },
  { label: "Completed", colour: "#16a34a" },
  { label: "AI-suggested", colour: "#a78bfa" },
];

export function MACCChart({ data, selectedId, onSelect, targets }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    bar: MACCBarData;
    x: number;
    y: number;
  } | null>(null);

  const { bars, summary } = data;

  // --- Scales ------------------------------------------------------------------
  const maxX = summary.max_abatement_potential;
  const xScale = scaleLinear().domain([0, maxX || 1]).range([0, INNER_W]);

  // y domain: span from min cost_per_tonne to max, include 0
  const costs = bars.map((b) => b.cost_per_tonne);
  const yMin = Math.min(0, ...costs);
  const yMax = Math.max(0, ...costs);
  const yPad = (yMax - yMin) * 0.1 || 10;
  const yScale = scaleLinear()
    .domain([yMin - yPad, yMax + yPad])
    .range([INNER_H, 0]);
  const yZero = yScale(0);

  // --- Axis ticks --------------------------------------------------------------
  const xTicks = xScale.ticks(6);
  const yTicks = yScale.ticks(6);

  // --- Tooltip helpers ---------------------------------------------------------
  function handleMouseEnter(bar: MACCBarData, clientX: number, clientY: number) {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    setTooltip({
      bar,
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  }

  if (bars.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-500">
        No initiatives yet — create one to see the MACC chart.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Summary chips */}
      <div className="mb-3 flex flex-wrap gap-4 text-sm text-gray-600">
        <span>
          <span className="font-semibold text-gray-900">
            {fmtTonnes(summary.total_co2e_reduction_annual_tonnes)}
          </span>{" "}
          abatement potential
        </span>
        <span>
          <span className="font-semibold text-gray-900">
            {fmtGbp(summary.total_capex_gbp)}
          </span>{" "}
          total CapEx
        </span>
        <span>
          Weighted avg{" "}
          <span className="font-semibold text-gray-900">
            £{summary.weighted_avg_cost_per_tonne.toFixed(0)}/tCO₂e
          </span>
        </span>
        <span>
          <span className="font-semibold text-emerald-600">
            {summary.negative_cost_count}
          </span>{" "}
          cost-saving /{" "}
          <span className="font-semibold text-gray-900">
            {summary.positive_cost_count}
          </span>{" "}
          net-cost
        </span>
      </div>

      {/* SVG chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full overflow-visible"
        aria-label="Marginal Abatement Cost Curve"
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {/* Grid lines */}
          {yTicks.map((t) => (
            <line
              key={t}
              x1={0}
              x2={INNER_W}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}

          {/* Bars */}
          {bars.map((bar) => (
            <MACCBar
              key={bar.initiative_id}
              bar={bar}
              xScale={xScale}
              yScale={yScale}
              yZero={yZero}
              isSelected={selectedId === bar.initiative_id}
              onClick={onSelect}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}

          {/* Zero baseline */}
          <line
            x1={0}
            x2={INNER_W}
            y1={yZero}
            y2={yZero}
            stroke="#374151"
            strokeWidth={1.5}
          />

          {/* X axis */}
          <g transform={`translate(0,${INNER_H})`}>
            {xTicks.map((t) => (
              <g key={t} transform={`translate(${xScale(t)},0)`}>
                <line y2={5} stroke="#9ca3af" />
                <text
                  y={16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#6b7280"
                >
                  {fmtTonnes(t)}
                </text>
              </g>
            ))}
            <text
              x={INNER_W / 2}
              y={40}
              textAnchor="middle"
              fontSize={11}
              fill="#374151"
              fontWeight={500}
            >
              Cumulative CO₂e abatement (tCO₂e)
            </text>
          </g>

          {/* Y axis */}
          <g>
            {yTicks.map((t) => (
              <g key={t} transform={`translate(0,${yScale(t)})`}>
                <line x2={-5} stroke="#9ca3af" />
                <text
                  x={-9}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="#6b7280"
                >
                  £{t.toFixed(0)}
                </text>
              </g>
            ))}
            <text
              transform={`translate(-52,${INNER_H / 2}) rotate(-90)`}
              textAnchor="middle"
              fontSize={11}
              fill="#374151"
              fontWeight={500}
            >
              Cost per tonne (£/tCO₂e)
            </text>
          </g>

          {/* Target overlay lines */}
          {targets?.map((t, i) => {
            const tx = xScale(Math.max(0, t.requiredReductionTonnes));
            return (
              <TargetOverlay
                key={i}
                targetX={tx}
                label={t.label}
                innerWidth={INNER_W}
                innerHeight={INNER_H}
                onTrack={t.onTrack}
                gapTonnes={t.gapTonnes}
              />
            );
          })}

          {/* Axis labels */}
          <text x={4} y={yZero - 6} fontSize={10} fill="#9ca3af">
            ↑ net cost
          </text>
          <text x={4} y={yZero + 14} fontSize={10} fill="#9ca3af">
            ↓ cost-saving
          </text>
        </g>
      </svg>

      {/* Tooltip (positioned relative to SVG container) */}
      {tooltip && (
        <MACCTooltip bar={tooltip.bar} x={tooltip.x} y={tooltip.y} />
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {LEGEND.map(({ label, colour }) => (
          <span key={label} className="flex items-center gap-1 text-xs text-gray-600">
            <span
              className="inline-block h-3 w-5 rounded-sm"
              style={{ background: colour }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
