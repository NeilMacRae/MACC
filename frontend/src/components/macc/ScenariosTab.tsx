/**
 * ScenariosTab — Extracted from ScenariosPage.tsx for the MACC Modelling hub.
 *
 * Contains: scenario card grid, compare panel, CreateScenarioModal, ScenarioManager.
 * Data dependencies: useScenarios, useInitiatives
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CreateScenarioModal, ScenarioManager } from '../scenarios/ScenarioManager';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ScenarioComparison } from '../scenarios/ScenarioComparison';
import { scenarioKeys, useScenario, useScenarios } from '../../hooks/useScenarios';
import type { Scenario } from '../../types/scenarios';

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// ── ScenarioCard ──────────────────────────────────────────────────────────────

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected: boolean;
  onToggleCompare: () => void;
  onManage: () => void;
}

function ScenarioCard({ scenario: sc, isSelected, onToggleCompare, onManage }: ScenarioCardProps) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition-all ${
        isSelected ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{sc.name}</h3>
            {sc.is_baseline && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                Baseline
              </span>
            )}
          </div>
          {sc.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{sc.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-3 mb-4">
        <MetricCell label="Initiatives" value={String(sc.initiative_count)} />
        <MetricCell
          label="Annual reduction"
          value={`${fmt(sc.total_co2e_reduction_annual_tonnes)} tCO₂e`}
        />
        <MetricCell label="Total CapEx" value={`£${fmt(sc.total_capex_gbp)}`} />
        <MetricCell
          label="Cost/tonne"
          value={sc.weighted_avg_cost_per_tonne ? `£${fmt(sc.weighted_avg_cost_per_tonne)}` : '—'}
        />
        <MetricCell
          label="Residual emissions"
          value={`${fmt(sc.residual_co2e_tonnes)} t`}
          span
        />
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onManage}>
          Manage
        </Button>
        <Button
          variant={isSelected ? 'primary' : 'secondary'}
          size="sm"
          onClick={onToggleCompare}
        >
          {isSelected ? '✓ Comparing' : 'Compare'}
        </Button>
      </div>
    </div>
  );
}

function MetricCell({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-[10px] text-gray-600 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

// ── ScenariosTab ──────────────────────────────────────────────────────────────

export function ScenariosTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useScenarios();

  const [showCreate, setShowCreate] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const { data: managingScenario } = useScenario(managingId);

  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const scenarios = data?.items ?? [];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Scenarios</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Model and compare abatement pathways
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          + New scenario
        </Button>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center text-sm text-gray-600">
          Loading scenarios…
        </div>
      )}
      {isError && (
        <div className="flex h-40 items-center justify-center text-sm text-red-500">
          Failed to load scenarios
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {scenarios.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <p className="text-sm text-gray-500">No scenarios yet.</p>
              <p className="text-xs text-gray-600 mt-1">
                Create a scenario to group initiatives into named pathways and compare costs.
              </p>
              <div className="mt-4">
                <Button onClick={() => setShowCreate(true)}>
                  Create first scenario
                </Button>
              </div>
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

      {compareIds.length >= 2 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">
              Scenario comparison ({compareIds.length} selected)
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setCompareIds([])}>
              Clear
            </Button>
          </div>
          <ScenarioComparison scenarioIds={compareIds} />
        </div>
      )}
      {compareIds.length === 1 && (
        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          Select one more scenario to compare
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateScenarioModal
          onClose={() => setShowCreate(false)}
          onCreate={(_s) => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: scenarioKeys.lists() });
          }}
        />
      )}

      {managingId && managingScenario && (
        <Modal
          open={!!managingId}
          onClose={() => setManagingId(null)}
          title={managingScenario.name}
          description={managingScenario.description ?? undefined}
          size="lg"
        >
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
        </Modal>
      )}
    </div>
  );
}
