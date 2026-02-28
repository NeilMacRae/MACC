/**
 * MACCPage — Marginal Abatement Cost Curve + initiative management.
 *
 * Layout (two-pane):
 *  top   — MACC chart (interactive SVG with tooltips + click-to-select)
 *  bottom — InitiativeTable (filterable/sortable list)
 *
 * Side effects:
 *  - Clicking a bar in the chart selects the row in the table (and vice-versa)
 *  - "+ New initiative" button opens InitiativeForm modal
 *  - Double-clicking a table row opens edit modal
 *  - Selected initiative shown in detail side panel (with StatusTransition)
 */

import { useState } from "react";
import { MACCChart } from "../components/macc/MACCChart";
import { InitiativeTable } from "../components/initiatives/InitiativeTable";
import { InitiativeForm } from "../components/initiatives/InitiativeForm";
import { StatusTransition } from "../components/initiatives/StatusTransition";
import { useMACCData, useInitiative, useDeleteInitiative } from "../hooks/useInitiatives";
import type { Initiative } from "../types/initiatives";

export function MACCPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // MACC data (all non-rejected statuses by default)
  const { data: maccData, isLoading: maccLoading, isError: maccError } = useMACCData();

  // Selected initiative detail
  const { data: selectedInitiative } = useInitiative(selectedId);

  const deleteMutation = useDeleteInitiative();

  async function handleDelete(id: string) {
    if (!confirm("Delete this initiative? This cannot be undone.")) return;
    await deleteMutation.mutateAsync(id);
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MACC Chart</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Marginal Abatement Cost Curve — initiatives sorted by cost per tonne
            of CO₂e reduced
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          + New initiative
        </button>
      </div>

      {/* MACC Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-800">
          Abatement Curve
        </h2>
        {maccLoading && (
          <div className="flex h-40 items-center justify-center text-sm text-gray-500">
            Loading MACC data…
          </div>
        )}
        {maccError && (
          <div className="flex h-40 items-center justify-center text-sm text-red-500">
            Failed to load MACC data
          </div>
        )}
        {maccData && (
          <MACCChart
            data={maccData}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
      </div>

      {/* Table + detail pane */}
      <div className="grid gap-6 xl:grid-cols-5">
        {/* Initiative table */}
        <div className="xl:col-span-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800">
            All Initiatives
          </h2>
          <InitiativeTable
            onEdit={(id) => setEditingId(id)}
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
        </div>

        {/* Detail side panel */}
        <div className="xl:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {selectedInitiative ? (
            <InitiativeDetail
              initiative={selectedInitiative}
              onEdit={() => setEditingId(selectedInitiative.id)}
              onDelete={() => handleDelete(selectedInitiative.id)}
              onTransitioned={(updated) => {
                setSelectedId(updated.id);
              }}
            />
          ) : (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-sm text-gray-400">
              <svg
                className="mb-3 h-10 w-10 text-gray-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 9.414V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="font-medium">No initiative selected</p>
              <p className="mt-1 text-gray-300">
                Click a bar or row to see details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <InitiativeForm
          onClose={() => setShowCreate(false)}
          onSaved={(saved) => {
            setSelectedId(saved.id);
          }}
        />
      )}

      {/* Edit modal */}
      {editingId && (
        <EditModal
          id={editingId}
          onClose={() => setEditingId(null)}
          onSaved={(saved) => setSelectedId(saved.id)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EditModal({
  id,
  onClose,
  onSaved,
}: {
  id: string;
  onClose: () => void;
  onSaved: (i: Initiative) => void;
}) {
  const { data: initiative, isLoading } = useInitiative(id);

  if (isLoading || !initiative)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="rounded-xl bg-white p-8 text-sm text-gray-500">
          Loading…
        </div>
      </div>
    );

  return (
    <InitiativeForm initiative={initiative} onClose={onClose} onSaved={onSaved} />
  );
}

function InitiativeDetail({
  initiative,
  onEdit,
  onDelete,
  onTransitioned,
}: {
  initiative: Initiative;
  onEdit: () => void;
  onDelete: () => void;
  onTransitioned: (updated: Initiative) => void;
}) {
  function fmt(n: number, d = 0) {
    return n.toLocaleString("en-GB", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-gray-900 leading-tight">
          {initiative.name}
        </h3>
        <div className="flex gap-1.5">
          <button
            onClick={onEdit}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-xs"
            title="Edit"
          >
            ✎ Edit
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-red-300 hover:bg-red-50 hover:text-red-600 text-xs"
            title="Delete"
          >
            ✕ Delete
          </button>
        </div>
      </div>

      {initiative.description && (
        <p className="text-xs text-gray-500">{initiative.description}</p>
      )}

      {/* Warnings banner */}
      {initiative.warnings && initiative.warnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
          {initiative.warnings.map((w) => (
            <p key={w.code} className="text-sm text-amber-700">⚠ {w.message}</p>
          ))}
        </div>
      )}

      {/* Key metrics */}
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-xs">
        <Metric label="£/tCO₂e" value={`£${fmt(initiative.cost_per_tonne, 0)}`} />
        <Metric
          label="Abatement (annual)"
          value={`${fmt(initiative.co2e_reduction_annual_tonnes, 1)} t`}
        />
        <Metric label="CapEx" value={`£${fmt(initiative.capex_gbp, 0)}`} />
        {initiative.opex_annual_gbp != null && (
          <Metric
            label="OpEx (annual)"
            value={`${initiative.opex_annual_gbp < 0 ? "−" : "+"}£${fmt(Math.abs(initiative.opex_annual_gbp), 0)}/yr`}
          />
        )}
        {initiative.payback_years != null && (
          <Metric label="Payback" value={`${initiative.payback_years} yrs`} />
        )}
        <Metric label="Lifespan" value={`${initiative.lifespan_years} yrs`} />
        {initiative.owner && (
          <Metric label="Owner" value={initiative.owner} className="col-span-2" />
        )}
        {initiative.confidence && (
          <Metric
            label="Confidence"
            value={
              initiative.confidence.charAt(0).toUpperCase() +
              initiative.confidence.slice(1)
            }
          />
        )}
      </dl>

      {/* Status transition */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-700">Status</p>
        <StatusTransition
          initiative={initiative}
          onTransitioned={onTransitioned}
        />
      </div>

      {/* Emission sources */}
      {initiative.emission_sources.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-700">
            Emission sources ({initiative.emission_sources.length})
          </p>
          <ul className="space-y-1">
            {initiative.emission_sources.slice(0, 5).map((s) => (
              <li key={s.id} className="text-xs text-gray-600">
                <span className="font-medium">{s.activity}</span>
                <span className="text-gray-400">
                  {" · "}
                  {s.question_group}
                  {s.company_unit_name ? ` · ${s.company_unit_name}` : ""}
                </span>
              </li>
            ))}
            {initiative.emission_sources.length > 5 && (
              <li className="text-xs text-gray-400">
                +{initiative.emission_sources.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {initiative.notes && (
        <div>
          <p className="mb-1 text-xs font-medium text-gray-700">Notes</p>
          <p className="text-xs text-gray-500 whitespace-pre-wrap">
            {initiative.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
