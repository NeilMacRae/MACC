/**
 * ScenarioComparison — Side-by-side metrics for multiple scenarios.
 *
 * Shows: total reduction, CapEx, OpEx, residual, cost/tonne, target alignment.
 * Highlights best performer in each metric (green).
 * Lists shared and unique initiatives.
 */

import { useCompareScenarios } from "../../hooks/useScenarios";
import type { ScenarioCompareItem } from "../../types/scenarios";
import { Badge } from "../common/Badge";

interface ScenarioComparisonProps {
  scenarioIds: string[];
}

function fmt(n: number, prefix = "") {
  return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtCost(n: number) {
  if (n === 0) return "—";
  return `£${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}/t`;
}

function MetricRow({
  label,
  values,
  best,
  format,
}: {
  label: string;
  values: number[];
  best: "max" | "min";
  format: (v: number, idx: number) => string;
}) {
  const optimal =
    best === "max"
      ? Math.max(...values)
      : Math.min(...values.filter((v) => v > 0));

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-4 text-sm text-gray-500 font-medium whitespace-nowrap">
        {label}
      </td>
      {values.map((v, i) => {
        const isBest = v === optimal && v !== 0;
        return (
          <td
            key={i}
            className={`py-2 text-sm text-right font-medium ${
              isBest ? "text-green-700" : "text-gray-800"
            }`}
          >
            {format(v, i)}
          </td>
        );
      })}
    </tr>
  );
}

export function ScenarioComparison({ scenarioIds }: ScenarioComparisonProps) {
  const { data, isLoading, isError } = useCompareScenarios(scenarioIds);

  if (scenarioIds.length < 2) {
    return (
      <div className="text-sm text-gray-600 py-4 text-center">
        Select at least 2 scenarios to compare
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-sm text-gray-600 py-4 text-center">
        Loading comparison…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-sm text-red-500 py-4 text-center">
        Failed to load comparison
      </div>
    );
  }

  const scenarios: ScenarioCompareItem[] = data.scenarios;

  return (
    <div className="space-y-6">
      {/* Metrics table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-2 pr-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Metric
              </th>
              {scenarios.map((s) => (
                <th
                  key={s.id}
                  className="pb-2 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide"
                >
                  <div className="flex flex-col items-end gap-0.5">
                    <span>{s.name}</span>
                    {s.is_baseline && (
                      <Badge variant="info">Baseline</Badge>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <MetricRow
              label="Initiatives"
              values={scenarios.map((s) => s.initiative_count)}
              best="max"
              format={(v) => String(v)}
            />
            <MetricRow
              label="Annual reduction (tCO₂e)"
              values={scenarios.map((s) => s.total_co2e_reduction_annual_tonnes)}
              best="max"
              format={(v) => fmt(v)}
            />
            <MetricRow
              label="Residual emissions (tCO₂e)"
              values={scenarios.map((s) => s.residual_co2e_tonnes)}
              best="min"
              format={(v) => fmt(v)}
            />
            <MetricRow
              label="Total CapEx"
              values={scenarios.map((s) => s.total_capex_gbp)}
              best="min"
              format={(v) => `£${fmt(v)}`}
            />
            <MetricRow
              label="Annual OpEx savings"
              values={scenarios.map((s) => Math.abs(s.total_opex_annual_gbp))}
              best="max"
              format={(v, idx) =>
                v === 0
                  ? "—"
                  : `£${fmt(v)} ${scenarios[idx].total_opex_annual_gbp < 0 ? "saving" : "cost"}`
              }
            />
            <MetricRow
              label="Avg cost/tonne"
              values={scenarios.map((s) => s.avg_cost_per_tonne)}
              best="min"
              format={fmtCost}
            />
            <tr className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-4 text-sm text-gray-500 font-medium">
                Meets targets
              </td>
              {scenarios.map((s) => (
                <td key={s.id} className="py-2 text-sm text-right">
                  {s.meets_targets ? (
                    <span className="text-green-600 font-medium">✓ Yes</span>
                  ) : (
                    <span className="text-red-500">
                      Gap {s.gap_to_target_pct.toFixed(1)}%
                    </span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Shared initiatives */}
      {data.shared_initiatives.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Shared initiatives ({data.shared_initiatives.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.shared_initiatives.map((i) => (
              <Badge key={i.id} variant="purple">
                {i.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Unique initiatives per scenario */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {scenarios.map((s) => {
          const unique = data.unique_initiatives[s.id] ?? [];
          return (
            <div key={s.id}>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Unique to{" "}
                <span className="text-gray-900">{s.name}</span> ({unique.length})
              </h4>
              {unique.length === 0 ? (
                <p className="text-xs text-gray-600">None</p>
              ) : (
                <div className="space-y-1">
                  {unique.map((i) => (
                    <Badge key={i.id} variant="default">
                      {i.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
