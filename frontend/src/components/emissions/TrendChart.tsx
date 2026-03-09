// ─── TrendChart (D3 line chart) ───────────────────────────────────────────────
import { scaleLinear, scaleBand } from 'd3-scale';
import { max, min } from 'd3-array';
import type { MarketFactorType } from '../../types/emissions';
import { useTrends } from '../../hooks/useEmissions';
import { LoadingSpinner } from '../layout/LoadingSpinner';

interface TrendChartProps {
  unitId?: string;
  mft: MarketFactorType;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}

export function TrendChart({ unitId, mft }: TrendChartProps) {
  const { data, isLoading, error } = useTrends(unitId, undefined, mft);

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner label="Loading trends…" /></div>;
  if (error || !data || data.trends.length === 0) {
    return <div className="p-8 text-center text-sm text-gray-600">No trend data available.</div>;
  }

  const W = 560, H = 220, ml = 56, mr = 24, mt = 16, mb = 36;
  const innerW = W - ml - mr;
  const innerH = H - mt - mb;
  const points = data.trends;

  const years = points.map((p) => p.year);
  const values = points.map((p) => p.co2e_tonnes);

  const minVal = (min(values) ?? 0) * 0.9;
  const maxVal = (max(values) ?? 1) * 1.1;

  const x = scaleBand()
    .domain(years.map(String))
    .range([0, innerW])
    .padding(0.4);

  const y = scaleLinear().domain([minVal, maxVal]).range([innerH, 0]);

  const barW = x.bandwidth();

  // Line path
  const linePath = points
    .map((p, i) => {
      const cx = (x(String(p.year)) ?? 0) + barW / 2;
      const cy = y(p.co2e_tonnes);
      return i === 0 ? `M ${cx} ${cy}` : `L ${cx} ${cy}`;
    })
    .join(' ');

  // Y axis ticks
  const yTicks = y.ticks(5);

  return (
    <div data-prism="card" className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Emissions Trend — {data.company_unit_name}
        </h3>
        <span className="text-xs text-gray-600">{mft} factors · tCO₂e / year</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Emissions trend chart">
        <g transform={`translate(${ml},${mt})`}>
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <line
              key={tick}
              x1={0}
              x2={innerW}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
          ))}

          {/* Bars */}
          {points.map((p) => {
            const bx = x(String(p.year)) ?? 0;
            const bh = innerH - y(p.co2e_tonnes);
            return (
              <rect
                key={p.year}
                x={bx}
                y={y(p.co2e_tonnes)}
                width={barW}
                height={bh}
                fill="#bfdbfe"
                rx={2}
              />
            );
          })}

          {/* Line */}
          <path d={linePath} fill="none" stroke="#1d4ed8" strokeWidth={2} />

          {/* Dots */}
          {points.map((p) => (
            <circle
              key={p.year}
              cx={(x(String(p.year)) ?? 0) + barW / 2}
              cy={y(p.co2e_tonnes)}
              r={4}
              fill="#1d4ed8"
            />
          ))}

          {/* Value labels above dots */}
          {points.map((p) => (
            <text
              key={p.year}
              x={(x(String(p.year)) ?? 0) + barW / 2}
              y={y(p.co2e_tonnes) - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#1d4ed8"
            >
              {fmt(p.co2e_tonnes)}
            </text>
          ))}

          {/* X axis labels */}
          {points.map((p) => (
            <text
              key={p.year}
              x={(x(String(p.year)) ?? 0) + barW / 2}
              y={innerH + 20}
              textAnchor="middle"
              fontSize={11}
              fill="#6b7280"
            >
              {p.year}
            </text>
          ))}

          {/* Y axis labels */}
          {yTicks.map((tick) => (
            <text
              key={tick}
              x={-8}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize={10}
              fill="#9ca3af"
            >
              {fmt(tick)}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
