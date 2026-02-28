/**
 * TargetForm — Create a new emission reduction target.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../services/api";
import type { Target, TargetCreate, TargetType } from "../../types/scenarios";

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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target year <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={2024}
            max={2100}
            value={targetYear}
            onChange={(e) => setTargetYear(e.target.value)}
            placeholder="2030"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target type <span className="text-red-500">*</span>
          </label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as TargetType)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="absolute">Absolute</option>
            <option value="intensity">Intensity</option>
          </select>
        </div>
      </div>

      {/* Reduction pct + baseline year */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reduction target (%) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0.1}
            max={100}
            step="any"
            value={targetValuePct}
            onChange={(e) => setTargetValuePct(e.target.value)}
            placeholder="50"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Baseline year <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={2000}
            max={2024}
            value={baselineYear}
            onChange={(e) => setBaselineYear(e.target.value)}
            placeholder="2020"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Baseline emissions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Baseline emissions (tCO₂e) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min={0}
          step="any"
          value={baselineCo2e}
          onChange={(e) => setBaselineCo2e(e.target.value)}
          placeholder="20000"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Scope coverage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Scope coverage
        </label>
        <div className="flex gap-4">
          {[1, 2, 3].map((s) => (
            <label key={s} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={scopeCoverage.includes(s)}
                onChange={() => toggleScope(s)}
                className="rounded border-gray-300 text-blue-600"
              />
              Scope {s}
            </label>
          ))}
        </div>
      </div>

      {/* Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source (optional)
        </label>
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g. SBTi, internal"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes (optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional context…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : "Add target"}
        </button>
      </div>
    </form>
  );
}
