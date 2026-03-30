/**
 * TargetForm — Create a new emission reduction target.
 * Prism-migrated: PrismInput, PrismSelect, PrismOption, PrismCheckbox.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  PrismInput,
  PrismSelect,
  PrismOption,
  PrismCheckbox,
} from "../../prism";
import { api } from "../../services/api";
import type { Target, TargetCreate, TargetType } from "../../types/scenarios";
import { Button } from '../common/Button';

interface TargetFormProps {
  onSaved: (target: Target) => void;
  onCancel: () => void;
}

export function TargetForm({ onSaved, onCancel }: TargetFormProps) {
  const [targetYear, setTargetYear] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("absolute");
  const [targetValuePct, setTargetValuePct] = useState("");
  const [baselineYear, setBaselineYear] = useState("");
  const [baselineCo2e, setBaselineCo2e] = useState("");
  const [scopeCoverage, setScopeCoverage] = useState<number[]>([1, 2, 3]);
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: TargetCreate) =>
      api.post<Target>("/context/targets", payload),
    onSuccess: (data) => {
      onSaved(data);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to create target");
    },
  });

  function toggleScope(scope: number) {
    setScopeCoverage((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const ty = parseInt(targetYear, 10);
    const by = parseInt(baselineYear, 10);
    const pct = parseFloat(targetValuePct);
    const baseline = parseFloat(baselineCo2e);

    if (isNaN(ty) || isNaN(by) || isNaN(pct) || isNaN(baseline)) {
      setError("All numeric fields are required");
      return;
    }
    if (ty <= by) {
      setError("Target year must be greater than baseline year");
      return;
    }
    if (pct <= 0 || pct > 100) {
      setError("Target reduction must be between 0.1% and 100%");
      return;
    }
    if (baseline <= 0) {
      setError("Baseline emissions must be positive");
      return;
    }

    const payload: TargetCreate = {
      target_year: ty,
      target_type: targetType,
      target_value_pct: pct,
      baseline_year: by,
      baseline_co2e_tonnes: baseline,
      scope_coverage: scopeCoverage.length > 0 ? scopeCoverage : null,
      source: source || null,
      notes: notes || null,
    };

    mutation.mutate(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Target year + type */}
      <div className="grid grid-cols-2 gap-3">
        <PrismInput
          type="number"
          label="Target year *"
          min={2024}
          max={2100}
          value={targetYear}
          onInput={(e) => setTargetYear((e.target as HTMLInputElement).value)}
          placeholder="2030"
          required
        />
        <PrismSelect
          label="Target type *"
          value={targetType}
          onChange={(e) => setTargetType((e.target as HTMLSelectElement).value as TargetType)}
        >
          <PrismOption value="absolute">Absolute</PrismOption>
          <PrismOption value="intensity">Intensity</PrismOption>
        </PrismSelect>
      </div>

      {/* Reduction pct + baseline year */}
      <div className="grid grid-cols-2 gap-3">
        <PrismInput
          type="number"
          label="Reduction target (%) *"
          min={0.1}
          max={100}
          step="any"
          value={targetValuePct}
          onInput={(e) => setTargetValuePct((e.target as HTMLInputElement).value)}
          placeholder="50"
          required
        />
        <PrismInput
          type="number"
          label="Baseline year *"
          min={2000}
          max={2024}
          value={baselineYear}
          onInput={(e) => setBaselineYear((e.target as HTMLInputElement).value)}
          placeholder="2020"
          required
        />
      </div>

      {/* Baseline emissions */}
      <PrismInput
        type="number"
        label="Baseline emissions (tCO₂e) *"
        min={0}
        step="any"
        value={baselineCo2e}
        onInput={(e) => setBaselineCo2e((e.target as HTMLInputElement).value)}
        placeholder="20000"
        required
      />

      {/* Scope coverage */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Scope coverage</p>
        <div className="flex gap-4">
          {[1, 2, 3].map((s) => (
            <PrismCheckbox
              key={s}
              checked={scopeCoverage.includes(s)}
              onChange={() => toggleScope(s)}
            >
              Scope {s}
            </PrismCheckbox>
          ))}
        </div>
      </div>

      {/* Source */}
      <PrismInput
        type="text"
        label="Source (optional)"
        value={source}
        onInput={(e) => setSource((e.target as HTMLInputElement).value)}
        placeholder="e.g. SBTi, internal"
      />

      {/* Notes */}
      <PrismInput
        type="text"
        label="Notes (optional)"
        value={notes}
        onInput={(e) => setNotes((e.target as HTMLInputElement).value)}
        placeholder="Additional context…"
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending}
          loading={mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : "Add target"}
        </Button>
      </div>
    </form>
  );
}
