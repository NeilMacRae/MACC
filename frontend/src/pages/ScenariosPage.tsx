/**
 * ScenariosPage — Scenario list, manager, and comparison view.
 *
 * Sections:
 *  1. Scenario cards grid — metrics summary, set baseline, manage
 *  2. Compare panel — select 2+ scenarios for side-by-side comparison
 *  3. ScenarioManager — modal to edit initiatives in a scenario
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "../components/layout/Header";
import { CreateScenarioModal, ScenarioManager } from "../components/scenarios/ScenarioManager";
import { ScenarioComparison } from "../components/scenarios/ScenarioComparison";
import { scenarioKeys, useScenario, useScenarios } from "../hooks/useScenarios";
import type { Scenario } from "../types/scenarios";

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function ScenariosPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useScenarios();

  const [showCreate, setShowCreate] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const { data: managingScenario } = useScenario(managingId);

  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const scenarios = data?.items ?? [];

  return (
    <>
      <Header
        title="Scenarios"
        subtitle="Model and compare abatement pathways"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + New scenario
          </button>
        }
      />

      <div className="p-6 space-y-8">
        {/* Loading / error states */}
        {isLoading && (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">
            Loading scenarios…
          </div>
        )}
        {isError && (
          <div className="flex h-40 items-center justify-center text-sm text-red-500">
            Failed to load scenarios
          </div>
        )}

        {/* Scenario grid */}
        {!isLoading && !isError && (
          <>
            {scenarios.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <p className="text-sm text-gray-500">No scenarios yet.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Create a scenario to group initiatives into named pathways and compare costs.
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Create first scenario
                </button>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {scenarios.map((sc) => (
                  <ScenarioCard
                    key={sc.id}
                    scenario={sc}
                    isSelected={compareIds.includes(sc.id)}
                    onToggleCompare={() => toggleCompare(sc.id)}
                    onManage={() => setManagingId(sc.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Compare panel */}
        {compareIds.length >= 2 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">
                Scenario comparison ({compareIds.length} selected)
              </h2>
              <button
                onClick={() => setCompareIds([])}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
            <ScenarioComparison scenarioIds={compareIds} />
          </div>
        )}
        {compareIds.length === 1 && (
          <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            Select one more scenario to compare
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateScenarioModal
          onClose={() => setShowCreate(false)}
          onCreate={(_s) => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: scenarioKeys.lists() });
          }}
        />
      )}

      {/* Manage modal */}
      {managingId && managingScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {managingScenario.name}
                </h3>
                {managingScenario.description && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {managingScenario.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setManagingId(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <ScenarioManager
                scenario={managingScenario}
                onClose={() => setManagingId(null)}
                onUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: scenarioKeys.lists() });
                  queryClient.invalidateQueries({
                    queryKey: scenarioKeys.detail(managingId),
                  });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// ScenarioCard
// ---------------------------------------------------------------------------

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected: boolean;
  onToggleCompare: () => void;
  onManage: () => void;
}

function ScenarioCard({
  scenario: sc,
  isSelected,
  onToggleCompare,
  onManage,
}: ScenarioCardProps) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition-all ${
        isSelected ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-200"
      }`}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {sc.name}
            </h3>
            {sc.is_baseline && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                Baseline
              </span>
            )}
          </div>
          {sc.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {sc.description}
            </p>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 mb-4">
        <MetricCell
          label="Initiatives"
          value={String(sc.initiative_count)}
        />
        <MetricCell
          label="Annual reduction"
          value={`${fmt(sc.total_co2e_reduction_annual_tonnes)} tCO₂e`}
        />
        <MetricCell
          label="Total CapEx"
          value={`£${fmt(sc.total_capex_gbp)}`}
        />
        <MetricCell
          label="Cost/tonne"
          value={
            sc.weighted_avg_cost_per_tonne
              ? `£${fmt(sc.weighted_avg_cost_per_tonne)}`
              : "—"
          }
        />
        <MetricCell
          label="Residual emissions"
          value={`${fmt(sc.residual_co2e_tonnes)} t`}
          span
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onManage}
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Manage
        </button>
        <button
          onClick={onToggleCompare}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            isSelected
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "border border-blue-300 text-blue-700 hover:bg-blue-50"
          }`}
        >
          {isSelected ? "✓ Comparing" : "Compare"}
        </button>
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}
