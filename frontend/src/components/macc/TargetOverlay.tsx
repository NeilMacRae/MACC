/**
 * TargetOverlay — renders horizontal target line on the MACC chart.
 *
 * The overlay renders a horizontal line at the x-position where cumulative
 * abatement equals (current_emissions - target_co2e_tonnes). If the bars
 * reach past this point, the scenario is on track.
 *
 * The component is designed to be rendered INSIDE the SVG <g> element of
 * MACCChart (translated by MARGIN already applied by parent).
 */

interface TargetOverlayProps {
  /** x pixel position where cumulative abatement meets the target */
  targetX: number;
  /** Human-readable label for the target (e.g. "2030 — 50% reduction") */
  label: string;
  /** Total inner width of the chart (to draw full-width line) */
  innerWidth: number;
  /** Total inner height of the chart (to draw full-height line) */
  innerHeight?: number;
  /** Whether the scenario is on track (has >= targetX abatement) */
  onTrack: boolean;
  /** Gap in tCO₂e if not on track */
  gapTonnes?: number;
}

export function TargetOverlay({
  targetX,
  label,
  innerWidth,
  innerHeight = 310,
  onTrack,
  gapTonnes,
}: TargetOverlayProps) {
  const colour = onTrack ? "#16a34a" : "#dc2626";
  const clampedX = Math.min(targetX, innerWidth);

  return (
    <g aria-label={`Target: ${label}`}>
      {/* Vertical target line */}
      <line
        x1={clampedX}
        x2={clampedX}
        y1={0}
        y2={innerHeight}
        stroke={colour}
        strokeWidth={2}
        strokeDasharray="6 3"
        opacity={0.85}
      />
      {/* Label at top */}
      <g transform={`translate(${clampedX + 4}, 8)`}>
        <rect
          x={-2}
          y={-10}
          width={Math.min(160, Math.max(80, label.length * 6 + 12))}
          height={14}
          rx={3}
          fill={colour}
          opacity={0.1}
        />
        <text
          fontSize={9}
          fill={colour}
          fontWeight={600}
        >
          {label}
        </text>
        {!onTrack && gapTonnes !== undefined && gapTonnes > 0 && (
          <text
            y={12}
            fontSize={9}
            fill={colour}
            opacity={0.9}
          >
            Gap: {gapTonnes.toLocaleString(undefined, { maximumFractionDigits: 0 })} t
          </text>
        )}
      </g>
      {/* On-track indicator */}
      {onTrack && (
        <text
          x={clampedX + 4}
          y={28}
          fontSize={9}
          fill={colour}
          fontWeight={500}
        >
          ✓ On track
        </text>
      )}
    </g>
  );
}
