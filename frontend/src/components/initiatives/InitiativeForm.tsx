/**
 * InitiativeForm — create/edit modal for an abatement initiative.
 *
 * Modes
 * -----
 * - create: blank form, POST on submit
 * - edit:   pre-filled form, PUT on submit
 *
 * Sources are selected via a guided 5-step cascade picker:
 *   Scope → Question Group → Question → Activity → Company Units
 */

import { useMemo, useState } from "react";
import {
  PrismInput,
  PrismTextarea,
  PrismSelect,
  PrismOption,
  PrismCheckbox,
} from "../../prism";
import {
  useCascadeScopes,
  useCascadeQuestionGroups,
  useCascadeQuestions,
  useCascadeActivities,
  useCascadeCompanyUnits,
} from "../../hooks/useEmissionsCascade";
import {
  useCreateInitiative,
  useUpdateInitiative,
} from "../../hooks/useInitiatives";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import type {
  CascadeCompanyUnitItem,
  ConfidenceLevel,
  Initiative,
  InitiativeCreate,
  InitiativeStatus,
  InitiativeWarning,
} from "../../types/initiatives";

interface Props {
  initiative?: Initiative | null;
  onClose: () => void;
  onSaved: (initiative: Initiative) => void;
}

const STATUS_OPTIONS: InitiativeStatus[] = [
  "idea",
  "planned",
  "approved",
  "in_progress",
  "completed",
  "rejected",
];
const CONFIDENCE_OPTIONS: ConfidenceLevel[] = ["high", "medium", "low"];

export function InitiativeForm({ initiative, onClose, onSaved }: Props) {
  const isEdit = !!initiative;
  const createMutation = useCreateInitiative();
  const updateMutation = useUpdateInitiative();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [name, setName] = useState(initiative?.name ?? "");
  const [description, setDescription] = useState(initiative?.description ?? "");
  const [status, setStatus] = useState<InitiativeStatus>(
    initiative?.status ?? "idea",
  );
  const [capexGbp, setCapexGbp] = useState(
    initiative?.capex_gbp != null ? String(initiative.capex_gbp) : "",
  );
  const [opexGbp, setOpexGbp] = useState(
    initiative?.opex_annual_gbp != null ? String(initiative.opex_annual_gbp) : "",
  );
  const [co2eReduction, setCo2eReduction] = useState(
    initiative?.co2e_reduction_annual_tonnes != null
      ? String(initiative.co2e_reduction_annual_tonnes)
      : "",
  );
  const [lifespanYears, setLifespanYears] = useState(
    String(initiative?.lifespan_years ?? 10),
  );
  const [owner, setOwner] = useState(initiative?.owner ?? "");
  const [confidence, setConfidence] = useState<ConfidenceLevel | "">(
    initiative?.confidence ?? "",
  );
  const [notes, setNotes] = useState(initiative?.notes ?? "");

  // ── Cascade state ───────────────────────────────────────────────────────────
  const [selectedScope, setSelectedScope] = useState<number | null>(null);
  const [selectedQG, setSelectedQG] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(
    new Set(initiative?.emission_sources.map((s) => s.id) ?? []),
  );

  // ── Cascade queries ─────────────────────────────────────────────────────────
  const { data: scopesData, isLoading: scopesLoading } = useCascadeScopes();
  const { data: qgData, isLoading: qgLoading } = useCascadeQuestionGroups(selectedScope);
  const { data: questionsData, isLoading: questionsLoading } = useCascadeQuestions(
    selectedScope, selectedQG
  );
  const { data: activitiesData, isLoading: activitiesLoading } = useCascadeActivities(
    selectedScope, selectedQG, selectedQuestion
  );
  const { data: unitsData, isLoading: unitsLoading } = useCascadeCompanyUnits(
    selectedActivity, selectedScope, selectedQG, selectedQuestion
  );

  // ── Derived: cost preview ───────────────────────────────────────────────────
  const costPreview = useMemo(() => {
    const capex = Number(capexGbp);
    const opex = opexGbp ? Number(opexGbp) : 0;
    const lifespan = Number(lifespanYears) || 10;
    const co2e = Number(co2eReduction);
    if (!capexGbp || !co2eReduction || co2e <= 0) return null;
    const cpt = (capex + opex * lifespan) / co2e;
    const payback =
      opex < 0 ? capex / Math.abs(opex) : null;
    return { cpt, payback };
  }, [capexGbp, opexGbp, lifespanYears, co2eReduction]);

  // ── Error + warning state ───────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverWarnings, setServerWarnings] = useState<InitiativeWarning[]>([]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (capexGbp === "" || isNaN(Number(capexGbp)) || Number(capexGbp) < 0)
      errs.capex_gbp = "Valid CapEx (≥ 0) required";
    if (
      co2eReduction === "" ||
      isNaN(Number(co2eReduction)) ||
      Number(co2eReduction) <= 0
    )
      errs.co2e = "CO₂e annual reduction must be > 0";
    if (selectedSourceIds.size === 0)
      errs.sources = "Select at least one emission source";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function toggleUnit(item: CascadeCompanyUnitItem) {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      next.has(item.emission_source_id)
        ? next.delete(item.emission_source_id)
        : next.add(item.emission_source_id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload: InitiativeCreate = {
      name: name.trim(),
      description: description.trim() || null,
      status,
      capex_gbp: Number(capexGbp),
      opex_annual_gbp: opexGbp ? Number(opexGbp) : null,
      co2e_reduction_annual_tonnes: Number(co2eReduction),
      lifespan_years: Number(lifespanYears) || 10,
      owner: owner.trim() || null,
      confidence: confidence || null,
      notes: notes.trim() || null,
      emission_source_ids: [...selectedSourceIds],
    };

    try {
      let saved: Initiative;
      if (isEdit && initiative) {
        saved = await updateMutation.mutateAsync({ id: initiative.id, payload });
      } else {
        saved = await createMutation.mutateAsync(payload);
      }
      // Surface any non-blocking warnings from the server
      if (saved.warnings && saved.warnings.length > 0) {
        setServerWarnings(saved.warnings);
        // Still navigate onSaved — warnings are non-blocking
      }
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setErrors((prev) => ({ ...prev, submit: msg }));
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      open
      title={isEdit ? "Edit Initiative" : "New Abatement Initiative"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <PrismInput
            type="text"
            label="Name *"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="e.g. LED Lighting Upgrade"
          />
          {errors.name && <p className="-mt-4 text-xs text-red-600">{errors.name}</p>}

          {/* Description */}
          <PrismTextarea
            label="Description"
            rows={2}
            value={description}
            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
            placeholder="Optional: describe the initiative"
          />

          {/* Status */}
          <PrismSelect
            label="Status"
            value={status}
            onChange={(e) => setStatus((e.target as HTMLSelectElement).value as InitiativeStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <PrismOption key={s} value={s}>
                {s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
              </PrismOption>
            ))}
          </PrismSelect>

          {/* CapEx + OpEx */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <PrismInput
                type="number"
                label="CapEx — upfront cost (£) *"
                min={0}
                step="any"
                value={capexGbp}
                onInput={(e) => setCapexGbp((e.target as HTMLInputElement).value)}
                placeholder="45000"
              />
              {errors.capex_gbp && <p className="mt-1 text-xs text-red-600">{errors.capex_gbp}</p>}
            </div>
            <div>
              <PrismInput
                type="number"
                label="OpEx — annual change (£)"
                step="any"
                value={opexGbp}
                onInput={(e) => setOpexGbp((e.target as HTMLInputElement).value)}
                placeholder="-12000 (saving) or +5000 (cost)"
              />
              <p className="mt-1 text-xs text-gray-600">
                Negative = annual saving, positive = additional annual cost
              </p>
            </div>
          </div>

          {/* CO2e + Lifespan */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <PrismInput
                type="number"
                label="Annual CO₂e reduction (tCO₂e/yr) *"
                min={0.001}
                step="any"
                value={co2eReduction}
                onInput={(e) => setCo2eReduction((e.target as HTMLInputElement).value)}
                placeholder="150"
              />
              {errors.co2e && <p className="mt-1 text-xs text-red-600">{errors.co2e}</p>}
            </div>
            <PrismInput
              type="number"
              label="Lifespan (years)"
              min={1}
              step={1}
              value={lifespanYears}
              onInput={(e) => setLifespanYears((e.target as HTMLInputElement).value)}
              placeholder="10"
            />
          </div>

          {/* Live cost preview */}
          {costPreview !== null ? (
            <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm space-y-1">
              <p className="text-blue-800">
                <span className="font-semibold">
                  £{costPreview.cpt.toFixed(0)}/tCO₂e
                </span>{" "}
                lifecycle cost per tonne
              </p>
              {costPreview.payback !== null && (
                <p className="text-blue-700 text-xs">
                  Payback: {costPreview.payback.toFixed(1)} years
                </p>
              )}
              {costPreview.cpt < 0 && (
                <p className="text-emerald-700 text-xs font-medium">
                  ✓ Net cost-saving initiative
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Fill CapEx &amp; CO₂e reduction to see £/tCO₂e preview
            </p>
          )}

          {/* Owner + Confidence */}
          <div className="grid grid-cols-2 gap-4">
            <PrismInput
              type="text"
              label="Owner"
              value={owner}
              onInput={(e) => setOwner((e.target as HTMLInputElement).value)}
              placeholder="Facilities Manager"
            />
            <PrismSelect
              label="Confidence"
              value={confidence}
              onChange={(e) =>
                setConfidence((e.target as HTMLSelectElement).value as ConfidenceLevel | "")
              }
            >
              <PrismOption value="">— select —</PrismOption>
              {CONFIDENCE_OPTIONS.map((c) => (
                <PrismOption key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </PrismOption>
              ))}
            </PrismSelect>
          </div>

          {/* Notes */}
          <PrismTextarea
            label="Notes"
            rows={2}
            value={notes}
            onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
            placeholder="Any additional context"
          />

          {/* ── Emission source cascade picker ────────────────────────────────── */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Emission sources *
            </p>
            {errors.sources && (
              <p className="mb-2 text-xs text-red-600">{errors.sources}</p>
            )}
            <p className="mb-3 text-xs text-gray-500">
              Navigate scope → question group → question → activity → site to
              find the sources this initiative will reduce.
            </p>

            {/* Step 1: Scope */}
            <div className="space-y-3">
              <CascadeStep
                label="1. Scope"
                loading={scopesLoading}
                items={(scopesData?.items ?? []).map((i) => ({
                  key: String(i.scope),
                  label: `Scope ${i.scope}`,
                  sub: `${i.co2e_tonnes.toFixed(1)} t · ${i.source_count} sources`,
                  selected: selectedScope === i.scope,
                  onSelect: () => {
                    setSelectedScope(i.scope);
                    setSelectedQG(null);
                    setSelectedQuestion(null);
                    setSelectedActivity(null);
                  },
                }))}
              />

              {/* Step 2: Question Group */}
              {selectedScope !== null && (
                <CascadeStep
                  label="2. Category"
                  loading={qgLoading}
                  items={(qgData?.items ?? []).map((i) => ({
                    key: i.question_group,
                    label: i.question_group,
                    sub: `${i.co2e_tonnes.toFixed(1)} t`,
                    selected: selectedQG === i.question_group,
                    onSelect: () => {
                      setSelectedQG(i.question_group);
                      setSelectedQuestion(null);
                      setSelectedActivity(null);
                    },
                  }))}
                />
              )}

              {/* Step 3: Question */}
              {selectedQG !== null && (
                <CascadeStep
                  label="3. Question"
                  loading={questionsLoading}
                  items={(questionsData?.items ?? []).map((i) => ({
                    key: i.question,
                    label: i.question,
                    sub: `${i.co2e_tonnes.toFixed(1)} t`,
                    selected: selectedQuestion === i.question,
                    onSelect: () => {
                      setSelectedQuestion(i.question);
                      setSelectedActivity(null);
                    },
                  }))}
                />
              )}

              {/* Step 4: Activity */}
              {selectedQuestion !== null && (
                <CascadeStep
                  label="4. Activity"
                  loading={activitiesLoading}
                  items={(activitiesData?.items ?? []).map((i) => ({
                    key: i.activity,
                    label: i.activity,
                    sub: `${i.co2e_tonnes.toFixed(1)} t`,
                    selected: selectedActivity === i.activity,
                    onSelect: () => setSelectedActivity(i.activity),
                  }))}
                />
              )}

              {/* Step 5: Company units (multi-select) */}
              {selectedActivity !== null && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-gray-600">
                    5. Sites / units (select all that apply)
                  </p>
                  {unitsLoading ? (
                    <p className="text-xs text-gray-600">Loading…</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                      {(unitsData?.items ?? []).length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-600">
                          No units found
                        </p>
                      ) : (
                        (unitsData?.items ?? []).map((unit) => (
                          <div key={unit.emission_source_id} className="px-3 py-2">
                            <PrismCheckbox
                              checked={selectedSourceIds.has(unit.emission_source_id)}
                              onChange={() => toggleUnit(unit)}
                            >
                              <span className="text-xs text-gray-700">
                                <span className="font-medium">
                                  {unit.company_unit_name}
                                </span>
                                {unit.company_unit_type && (
                                  <span className="text-gray-400">
                                    {" "}· {unit.company_unit_type}
                                  </span>
                                )}
                                <span className="ml-2 text-gray-400">
                                  {unit.co2e_tonnes.toFixed(1)} t
                                </span>
                              </span>
                            </PrismCheckbox>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-gray-600">
              {selectedSourceIds.size} source
              {selectedSourceIds.size !== 1 ? "s" : ""} selected
            </p>
          </div>

          {/* Server warnings (non-blocking) */}
          {serverWarnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
              {serverWarnings.map((w) => (
                <p key={w.code} className="text-sm text-amber-700">
                  ⚠ {w.message}
                </p>
              ))}
            </div>
          )}

          {/* Submit error */}
          {errors.submit && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {errors.submit}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {isPending
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Create initiative"}
            </Button>
          </div>
        </form>
    </Modal>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────────

interface CascadeItem {
  key: string;
  label: string;
  sub?: string;
  selected: boolean;
  onSelect: () => void;
}

function CascadeStep({
  label,
  loading,
  items,
}: {
  label: string;
  loading: boolean;
  items: CascadeItem[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-gray-600">{label}</p>
      {loading ? (
        <p className="text-xs text-gray-600">Loading…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Button
              key={item.key}
              type="button"
              size="sm"
              variant={item.selected ? "primary" : "secondary"}
              onClick={item.onSelect}
            >
              {item.label}
              {item.sub && <span className="ml-1 opacity-60">{item.sub}</span>}
            </Button>
          ))}
          {items.length === 0 && (
            <p className="text-xs text-gray-600">No items</p>
          )}
        </div>
      )}
    </div>
  );
}
