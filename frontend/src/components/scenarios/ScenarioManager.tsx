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
import {
  PrismInput,
  PrismTextarea,
  PrismCheckbox,
} from "../../prism";
import { api } from "../../services/api";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
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
        <Button
          variant={scenario.is_baseline ? "primary" : "secondary"}
          size="sm"
          onClick={toggleBaseline}
          disabled={updateMutation.isPending}
        >
          {scenario.is_baseline ? "★ Baseline" : "Set as baseline"}
        </Button>
        <div className="ml-auto">
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            Delete scenario
          </Button>
        </div>
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
          <p className="text-sm text-gray-600">No initiatives yet. Add some below.</p>
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
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemove(i.id)}
                    disabled={removeMutation.isPending}
                  >
                    ×
                  </Button>
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
              <div
                key={i.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-white"
              >
                <PrismCheckbox
                  checked={selectedInitIds.has(i.id)}
                  onChange={() => toggleInit(i.id)}
                >
                  <span className="flex-1 min-w-0 truncate text-gray-800">
                    {i.name}
                  </span>
                  <span className="text-xs text-gray-600 flex-shrink-0">
                    {i.co2e_reduction_annual_tonnes.toLocaleString()} t
                  </span>
                </PrismCheckbox>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <Button
              size="sm"
              onClick={handleAddSelected}
              disabled={selectedInitIds.size === 0}
              loading={addMutation.isPending}
            >
              {addMutation.isPending
                ? "Adding…"
                : `Add selected (${selectedInitIds.size})`}
            </Button>
          </div>
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
    <Modal open title="New scenario" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div>
          <PrismInput
            type="text"
            label="Name *"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="e.g. Aggressive 2030 Plan"
            required
          />
        </div>
        <div>
          <PrismTextarea
            label="Description (optional)"
            value={description}
            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
            rows={2}
            placeholder="What makes this scenario distinct?"
          />
        </div>
        <PrismCheckbox
          checked={isBaseline}
          onChange={(e) => setIsBaseline((e.target as HTMLInputElement).checked)}
        >
          Set as baseline scenario
        </PrismCheckbox>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create scenario"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
