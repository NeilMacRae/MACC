/**
 * ContextForm — Edit organisational context fields.
 *
 * Supports create (context doesn't exist yet) and update (existing context).
 * All fields are optional on the server side but form shows them all.
 */

import { useState, useEffect } from "react";
import {
  PrismAlert,
  PrismInput,
  PrismSelect,
  PrismOption,
  PrismTag,
  PrismTextarea,
} from "../../prism";
import type { OrgContext, OrgContextUpsert, SustainabilityMaturity } from "../../types/scenarios";
import { Button } from '../common/Button';

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
        <PrismAlert variant="danger" title="Unable to save">
          {error}
        </PrismAlert>
      )}

      {/* Row 1: sector + maturity */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PrismInput
          type="text"
          label="Industry sector"
          value={industrySector}
          onInput={(e) => setIndustrySector(String((e.target as any).value ?? ""))}
          placeholder="e.g. Manufacturing"
        />
        <PrismSelect
          label="Sustainability maturity"
          value={maturity}
          onChange={(e) =>
            setMaturity(String((e.target as any).value ?? "") as SustainabilityMaturity | "")
          }
        >
          <PrismOption value="">— Select —</PrismOption>
          {MATURITY_OPTIONS.map((o) => (
            <PrismOption key={o.value} value={o.value}>
              {o.label}
            </PrismOption>
          ))}
        </PrismSelect>
      </div>

      {/* Row 2: employee count + target year */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PrismInput
          type="number"
          label="Employee count"
          min={1}
          value={employeeCount}
          onInput={(e) => setEmployeeCount(String((e.target as any).value ?? ""))}
          placeholder="e.g. 2500"
        />
        <PrismInput
          type="number"
          label="Net-zero target year"
          min={2024}
          max={2100}
          value={targetYear}
          onInput={(e) => setTargetYear(String((e.target as any).value ?? ""))}
          placeholder="e.g. 2030"
        />
      </div>

      {/* Row 3: revenue + budget */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PrismInput
          type="number"
          label="Annual revenue (£)"
          min={0}
          step="any"
          value={annualRevenue}
          onInput={(e) => setAnnualRevenue(String((e.target as any).value ?? ""))}
          placeholder="e.g. 150000000"
        />
        <PrismInput
          type="number"
          label="Sustainability budget constraint (£)"
          min={0}
          step="any"
          value={budgetConstraint}
          onInput={(e) => setBudgetConstraint(String((e.target as any).value ?? ""))}
          placeholder="e.g. 500000"
        />
      </div>

      {/* Operating geographies tag input */}
      <div>
        <div className="flex gap-2 mb-2">
          <PrismInput
            type="text"
            label="Operating geographies"
            helpText={`${geographies.length}/50`}
            value={geoInput}
            onInput={(e) => setGeoInput(String((e.target as any).value ?? ""))}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addGeo();
              }
            }}
            placeholder="Type a country/region and press Enter"
          />
          <Button type="button" variant="secondary" size="sm" onClick={addGeo}>
            Add
          </Button>
        </div>
        {geographies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {geographies.map((g) => (
              <div key={g} className="flex items-center gap-1">
                <PrismTag variant="neutral" size="small" title={g}>
                  {g}
                </PrismTag>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGeo(g)}
                  aria-label={`Remove ${g}`}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <PrismTextarea
        label="Notes"
        value={notes}
        onInput={(e) => setNotes(String((e.target as any).value ?? ""))}
        rows={3}
        placeholder="Strategic context, priorities, constraints…"
      />

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSaving}
          loading={isSaving}
        >
          {isSaving ? "Saving…" : "Save context"}
        </Button>
      </div>
    </form>
  );
}
