/**
 * ScenarioManager — Create/edit scenarios, manage initiative membership.
 *
 * Features:
 *  - Create scenario modal with name, description, is_baseline toggle
 *  - Add initiatives from the org's initiative pool (checklist)
 *  - Remove individual initiatives
 *  - Set/unset baseline
 *  - Delete scenario
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import {
  useCreateScenario,
  useUpdateScenario,
  useDeleteScenario,
  useAddInitiatives,
  useRemoveInitiative,
} from "../../hooks/useScenarios";
import type {
  Scenario,
  ScenarioDetail,
  ScenarioCreate,
} from "../../types/scenarios";
import type { InitiativeListResponse } from "../../types/initiatives";

interface ScenarioManagerProps {
  scenario: ScenarioDetail;
  onClose: () => void;
  onUpdated: () => void;
}

export function ScenarioManager({ scenario, onClose, onUpdated }: ScenarioManagerProps) {
  const [selectedInitIds, setSelectedInitIds] = useState<Set<string>>(new Set());
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Load all org initiatives
  const { data: initiativesData } = useQuery<InitiativeListResponse>({
    queryKey: ["initiatives", "list", {}],
    queryFn: () =>
      api.get<InitiativeListResponse>("/initiatives", { page_size: 100 }),
  });

  const updateMutation = useUpdateScenario();
  const deleteMutation = useDeleteScenario();
  const addMutation = useAddInitiatives();
  const removeMutation = useRemoveInitiative();

  const existingIds = new Set(scenario.initiatives.map((i) => i.id));
  const availableInitiatives = initiativesData?.items.filter(
    (i) => !existingIds.has(i.id)
  ) ?? [];

  function toggleInit(id: string) {
    setSelectedInitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddSelected() {
    if (selectedInitIds.size === 0) return;
    const startOrder =
      scenario.initiatives.length > 0
        ? Math.max(...scenario.initiatives.map((i) => i.display_order)) + 1
        : 1;
    await addMutation.mutateAsync({
      scenarioId: scenario.id,
      data: {
        initiative_ids: Array.from(selectedInitIds),
        display_order_start: startOrder,
      },
    });
    setSelectedInitIds(new Set());
    onUpdated();
  }

  async function handleRemove(initiativeId: string) {
    setRemoveError(null);
    try {
      await removeMutation.mutateAsync({ scenarioId: scenario.id, initiativeId });
      onUpdated();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Remove failed");
    }
  }

  async function toggleBaseline() {
    await updateMutation.mutateAsync({
      id: scenario.id,
      data: { is_baseline: !scenario.is_baseline },
    });
    onUpdated();
  }

  async function handleDelete() {
    if (!confirm(`Delete scenario "${scenario.name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(scenario.id);
    onClose();
  }

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleBaseline}
          disabled={updateMutation.isPending}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
            scenario.is_baseline
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
          }`}
        >
          {scenario.is_baseline ? "★ Baseline" : "Set as baseline"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="ml-auto rounded px-2 py-1 text-xs text-red-500 border border-red-200 hover:bg-red-50"
        >
          Delete scenario
        </button>
      </div>

      {/* Current initiatives */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Initiatives in this scenario ({scenario.initiatives.length})
        </h4>
        {removeError && (
          <div className="mb-2 text-xs text-red-600">{removeError}</div>
        )}
        {scenario.initiatives.length === 0 ? (
          <p className="text-sm text-gray-400">No initiatives yet. Add some below.</p>
        ) : (
          <div className="space-y-1">
            {scenario.initiatives
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-gray-800 truncate">
                      {i.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {i.co2e_reduction_annual_tonnes.toLocaleString()} tCO₂e/yr
                      · £{i.cost_per_tonne.toLocaleString()}/t
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(i.id)}
                    disabled={removeMutation.isPending}
                    className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 ml-2"
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Add initiatives */}
      {availableInitiatives.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Add initiatives
          </h4>
          <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-md p-2 bg-gray-50">
            {availableInitiatives.map((i) => (
              <label
                key={i.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-white cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedInitIds.has(i.id)}
                  onChange={() => toggleInit(i.id)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="flex-1 min-w-0 truncate text-gray-800">
                  {i.name}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {i.co2e_reduction_annual_tonnes.toLocaleString()} t
                </span>
              </label>
            ))}
          </div>
          <button
            onClick={handleAddSelected}
            disabled={selectedInitIds.size === 0 || addMutation.isPending}
            className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {addMutation.isPending
              ? "Adding…"
              : `Add selected (${selectedInitIds.size})`}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CreateScenarioModal
// ---------------------------------------------------------------------------

interface CreateScenarioModalProps {
  onClose: () => void;
  onCreate: (s: Scenario) => void;
}

export function CreateScenarioModal({ onClose, onCreate }: CreateScenarioModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isBaseline, setIsBaseline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useCreateScenario();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const payload: ScenarioCreate = {
      name: name.trim(),
      description: description || null,
      is_baseline: isBaseline,
    };
    try {
      const result = await mutation.mutateAsync(payload);
      onCreate(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">
            New scenario
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aggressive 2030 Plan"
              required
              autoFocus
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What makes this scenario distinct?"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isBaseline}
              onChange={(e) => setIsBaseline(e.target.checked)}
              className="rounded border-gray-300 text-blue-600"
            />
            Set as baseline scenario
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? "Creating…" : "Create scenario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
