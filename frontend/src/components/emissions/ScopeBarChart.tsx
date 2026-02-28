// ─── Scope bar chart (D3 scales) ──────────────────────────────────────────────
import { scaleBand, scaleLinear } from 'd3-scale';
import type { ByScopeBreakdown } from '../../types/emissions';

const SCOPE_COLOURS: Record<string, string> = {
  'Scope 1': '#1d4ed8',
  'Scope 2': '#2563eb',
  'Scope 3': '#93c5fd',
};

interface ScopeChartProps {
  by_scope: ByScopeBreakdown;
}

export function ScopeBarChart({ by_scope }: ScopeChartProps) {
  const data = [
    { label: 'Scope 1', value: by_scope.scope_1.co2e_tonnes, pct: by_scope.scope_1.percentage },
    { label: 'Scope 2', value: by_scope.scope_2.co2e_tonnes, pct: by_scope.scope_2.percentage },
    { label: 'Scope 3', value: by_scope.scope_3.co2e_tonnes, pct: by_scope.scope_3.percentage },
  ];

  const W = 360, H = 160, ml = 60, mr = 16, mt = 12, mb = 32;
  const innerW = W - ml - mr;
  const innerH = H - mt - mb;

  const x = scaleLinear()
    .domain([0, Math.max(...data.map((d) => d.value))])
    .range([0, innerW]);

  const y = scaleBand()
    .domain(data.map((d) => d.label))
    .range([0, innerH])
    .padding(0.35);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Scope emissions breakdown">
      <g transform={`translate(${ml},${mt})`}>
        {data.map((d) => (
          <g key={d.label} transform={`translate(0,${y(d.label)})`}>
            <rect
              x={0}
              y={0}
              width={x(d.value)}
              height={y.bandwidth()}
              fill={SCOPE_COLOURS[d.label]}
              rx={3}
            />
            <text
              x={x(d.value) + 6}
              y={y.bandwidth() / 2 + 4}
              fontSize={11}
              fill="#374151"
            >
              {d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} t
              <tspan fill="#6b7280"> ({d.pct}%)</tspan>
            </text>
          </g>
        ))}
        {/* Y axis labels */}
        {data.map((d) => (
          <text
            key={d.label}
            x={-8}
            y={(y(d.label) ?? 0) + y.bandwidth() / 2 + 4}
            textAnchor="end"
            fontSize={11}
            fill="#6b7280"
          >
            {d.label}
          </text>
        ))}
      </g>
    </svg>
  );
}
