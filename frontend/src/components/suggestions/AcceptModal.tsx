/**
 * AcceptModal — Modal for accepting/modifying AI suggestions before creating initiatives
 *
 * Allows users to:
 * - Review per-activity breakdown (for multi-activity suggestions)
 * - Override field values (name, cost, reduction, owner)
 * - Select scenarios to add the initiative(s) to
 * - Confirm creation
 */

import { useState } from "react";
import { PrismCheckbox, PrismInput } from "../../prism";
import { useScenarios } from "../../hooks/useScenarios";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { Modal } from "../common/Modal";
import type { SuggestionDetail, SuggestionAccept } from "../../types/suggestions";

interface AcceptModalProps {
  suggestion: SuggestionDetail;
  onClose: () => void;
  onConfirm: (overrides: SuggestionAccept) => void;
  isLoading?: boolean;
}

export function AcceptModal({
  suggestion,
  onClose,
  onConfirm,
  isLoading = false,
}: AcceptModalProps) {
  const [name, setName] = useState(suggestion.name);
  const [capex, setCapex] = useState(suggestion.estimated_capex_gbp);
  const [reduction, setReduction] = useState(suggestion.estimated_co2e_reduction_annual_tonnes);
  const [owner, setOwner] = useState("");
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);

  const { data: scenariosResponse } = useScenarios();
  const scenarios = scenariosResponse?.items ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const overrides: SuggestionAccept = {};

    // Only include overrides if they differ from original
    if (name !== suggestion.name) {
      overrides.name = name;
    }
    if (capex !== suggestion.estimated_capex_gbp) {
      overrides.capex_gbp = capex;
    }
    if (reduction !== suggestion.estimated_co2e_reduction_annual_tonnes) {
      overrides.co2e_reduction_annual_tonnes = reduction;
    }
    if (owner.trim()) {
      overrides.owner = owner.trim();
    }
    if (selectedScenarios.length > 0) {
      overrides.add_to_scenario_ids = selectedScenarios;
    }

    onConfirm(overrides);
  }

  function toggleScenario(id: string) {
    setSelectedScenarios((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function fmt(n: number, d = 0) {
    return n.toLocaleString("en-GB", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  const isMultiActivity = suggestion.activity_breakdown && suggestion.activity_breakdown.length > 1;

  return (
    <Modal open title="Accept Suggestion" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <p className="mb-4 text-sm text-gray-500">
          Review and optionally modify before creating
        </p>

        <div className="space-y-6">
            {/* Multi-activity info */}
            {isMultiActivity && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex gap-3">
                  <svg className="flex-shrink-0 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Multi-Activity Suggestion</p>
                    <p className="text-sm text-blue-800 mt-1">
                      This will create <strong>{suggestion.activity_breakdown!.length} separate initiatives</strong>, one per activity:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {suggestion.activity_breakdown!.map((breakdown, idx) => (
                        <li key={idx} className="text-sm text-blue-800">
                          • <strong>{breakdown.activity}</strong> — £{fmt(breakdown.estimated_capex_gbp, 0)}, {fmt(breakdown.estimated_co2e_reduction_annual_tonnes, 1)} t/yr
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Name override */}
            <div>
              <PrismInput
                id="name"
                type="text"
                label="Initiative Name"
                value={name}
                onInput={(e) => setName((e.target as HTMLInputElement).value)}
                disabled={isMultiActivity || undefined}
              />
              {isMultiActivity && (
                <p className="mt-1 text-xs text-gray-500">
                  Names will be auto-generated per activity
                </p>
              )}
            </div>

            {/* CapEx override */}
            <div>
              <PrismInput
                id="capex"
                type="number"
                label="CapEx (£)"
                min={0}
                step={1000}
                value={capex}
                onInput={(e) => setCapex(parseFloat((e.target as HTMLInputElement).value))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Original: £{fmt(suggestion.estimated_capex_gbp, 0)}
                {isMultiActivity && " (total across all activities)"}
              </p>
            </div>

            {/* CO2e reduction override */}
            <div>
              <PrismInput
                id="reduction"
                type="number"
                label="Annual CO₂e Reduction (tonnes)"
                min={0}
                step={0.1}
                value={reduction}
                onInput={(e) => setReduction(parseFloat((e.target as HTMLInputElement).value))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Original: {fmt(suggestion.estimated_co2e_reduction_annual_tonnes, 1)} t/yr
                {isMultiActivity && " (total across all activities)"}
              </p>
            </div>

            {/* Owner */}
            <div>
              <PrismInput
                id="owner"
                type="text"
                label="Owner (optional)"
                placeholder="e.g., Operations Manager"
                value={owner}
                onInput={(e) => setOwner((e.target as HTMLInputElement).value)}
              />
            </div>

            {/* Add to scenarios */}
            {scenarios.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add to Scenarios
                  <span className="ml-1 text-xs font-normal text-gray-500">(optional)</span>
                </label>
                <div className="space-y-2">
                  {scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      <PrismCheckbox
                        checked={selectedScenarios.includes(scenario.id)}
                        onChange={() => toggleScenario(scenario.id)}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {scenario.name}
                          </p>
                          {scenario.description && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {scenario.description}
                            </p>
                          )}
                        </div>
                        {scenario.is_baseline && (
                          <Badge variant="info">Baseline</Badge>
                        )}
                      </PrismCheckbox>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Initiative(s) will be created globally regardless of scenario selection
                </p>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="secondary" disabled={isLoading} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            {isLoading ? "Creating..." : isMultiActivity ? `Create ${suggestion.activity_breakdown!.length} Initiatives` : "Create Initiative"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
