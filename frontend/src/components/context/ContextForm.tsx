/**
 * ContextForm — Edit organisational context fields.
 *
 * Supports create (context doesn't exist yet) and update (existing context).
 * All fields are optional on the server side but form shows them all.
 */

import { useState, useEffect } from "react";
import type { OrgContext, OrgContextUpsert, SustainabilityMaturity } from "../../types/scenarios";

interface ContextFormProps {
  initial: OrgContext | null;
  onSave: (data: OrgContextUpsert) => Promise<void>;
  isSaving: boolean;
}

const MATURITY_OPTIONS: { value: SustainabilityMaturity; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export function ContextForm({ initial, onSave, isSaving }: ContextFormProps) {
  const [industrySector, setIndustrySector] = useState(initial?.industry_sector ?? "");
  const [employeeCount, setEmployeeCount] = useState(
    initial?.employee_count !== null && initial?.employee_count !== undefined
      ? String(initial.employee_count)
      : ""
  );
  const [annualRevenue, setAnnualRevenue] = useState(
    initial?.annual_revenue_gbp !== null && initial?.annual_revenue_gbp !== undefined
      ? String(initial.annual_revenue_gbp)
      : ""
  );
  const [geographies, setGeographies] = useState<string[]>(initial?.operating_geographies ?? []);
  const [geoInput, setGeoInput] = useState("");
  const [maturity, setMaturity] = useState<SustainabilityMaturity | "">(
    initial?.sustainability_maturity ?? ""
  );
  const [budgetConstraint, setBudgetConstraint] = useState(
    initial?.budget_constraint_gbp !== null && initial?.budget_constraint_gbp !== undefined
      ? String(initial.budget_constraint_gbp)
      : ""
  );
  const [targetYear, setTargetYear] = useState(
    initial?.target_year !== null && initial?.target_year !== undefined
      ? String(initial.target_year)
      : ""
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  // Re-sync if initial context loads after mount
  useEffect(() => {
    if (!initial) return;
    setIndustrySector(initial.industry_sector ?? "");
    setEmployeeCount(initial.employee_count != null ? String(initial.employee_count) : "");
    setAnnualRevenue(initial.annual_revenue_gbp != null ? String(initial.annual_revenue_gbp) : "");
    setGeographies(initial.operating_geographies ?? []);
    setMaturity(initial.sustainability_maturity ?? "");
    setBudgetConstraint(
      initial.budget_constraint_gbp != null ? String(initial.budget_constraint_gbp) : ""
    );
    setTargetYear(initial.target_year != null ? String(initial.target_year) : "");
    setNotes(initial.notes ?? "");
  }, [initial?.id]);

  function addGeo() {
    const trimmed = geoInput.trim();
    if (!trimmed || geographies.includes(trimmed)) return;
    if (geographies.length >= 50) {
      setError("Maximum 50 operating geographies");
      return;
    }
    setGeographies([...geographies, trimmed]);
    setGeoInput("");
  }

  function removeGeo(g: string) {
    setGeographies(geographies.filter((x) => x !== g));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: OrgContextUpsert = {};
    if (industrySector) payload.industry_sector = industrySector;
    if (employeeCount) {
      const n = parseInt(employeeCount, 10);
      if (isNaN(n) || n <= 0) {
        setError("Employee count must be a positive integer");
        return;
      }
      payload.employee_count = n;
    }
    if (annualRevenue) {
      const n = parseFloat(annualRevenue);
      if (isNaN(n) || n <= 0) {
        setError("Annual revenue must be a positive number");
        return;
      }
      payload.annual_revenue_gbp = n;
    }
    if (geographies.length > 0) payload.operating_geographies = geographies;
    if (maturity) payload.sustainability_maturity = maturity;
    if (budgetConstraint) {
      const n = parseFloat(budgetConstraint);
      if (isNaN(n) || n <= 0) {
        setError("Budget constraint must be a positive number");
        return;
      }
      payload.budget_constraint_gbp = n;
    }
    if (targetYear) {
      const n = parseInt(targetYear, 10);
      if (!isNaN(n)) payload.target_year = n;
    }
    if (notes) payload.notes = notes;

    try {
      await onSave(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Row 1: sector + maturity */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Industry sector
          </label>
          <input
            type="text"
            value={industrySector}
            onChange={(e) => setIndustrySector(e.target.value)}
            placeholder="e.g. Manufacturing"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sustainability maturity
          </label>
          <select
            value={maturity}
            onChange={(e) => setMaturity(e.target.value as SustainabilityMaturity | "")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">— Select —</option>
            {MATURITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: employee count + target year */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee count
          </label>
          <input
            type="number"
            min={1}
            value={employeeCount}
            onChange={(e) => setEmployeeCount(e.target.value)}
            placeholder="e.g. 2500"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Net-zero target year
          </label>
          <input
            type="number"
            min={2024}
            max={2100}
            value={targetYear}
            onChange={(e) => setTargetYear(e.target.value)}
            placeholder="e.g. 2030"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Row 3: revenue + budget */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Annual revenue (£)
          </label>
          <input
            type="number"
            min={0}
            step="any"
            value={annualRevenue}
            onChange={(e) => setAnnualRevenue(e.target.value)}
            placeholder="e.g. 150000000"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sustainability budget constraint (£)
          </label>
          <input
            type="number"
            min={0}
            step="any"
            value={budgetConstraint}
            onChange={(e) => setBudgetConstraint(e.target.value)}
            placeholder="e.g. 500000"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Operating geographies tag input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operating geographies{" "}
          <span className="text-gray-400 font-normal">({geographies.length}/50)</span>
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={geoInput}
            onChange={(e) => setGeoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addGeo();
              }
            }}
            placeholder="Type a country/region and press Enter"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addGeo}
            className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Add
          </button>
        </div>
        {geographies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {geographies.map((g) => (
              <span
                key={g}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
              >
                {g}
                <button
                  type="button"
                  onClick={() => removeGeo(g)}
                  className="text-blue-500 hover:text-blue-700 leading-none"
                  aria-label={`Remove ${g}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Strategic context, priorities, constraints…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save context"}
        </button>
      </div>
    </form>
  );
}
