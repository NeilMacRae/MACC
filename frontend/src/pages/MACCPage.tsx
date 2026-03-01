/**
 * MACCPage — Marginal Abatement Cost Curve + initiative management.
 *
 * Layout (two-pane):
 *  top   — MACC chart (interactive SVG with tooltips + click-to-select)
 *  bottom — InitiativeTable (filterable/sortable list)
 *
 * Side effects:
 *  - Clicking a bar in the chart selects the row in the table (and vice-versa)
 *  - "+ New initiative" button opens creation choice modal
 *  - Double-clicking a table row opens edit modal
 *  - Selected initiative shown in detail side panel (with StatusTransition)
 */

import { useState } from "react";
import { MACCChart } from "../components/macc/MACCChart";
import { InitiativeTable } from "../components/initiatives/InitiativeTable";
import { InitiativeForm } from "../components/initiatives/InitiativeForm";
import { StatusTransition } from "../components/initiatives/StatusTransition";
import { SuggestionRequest } from "../components/suggestions/SuggestionRequest";
import { SuggestionCard } from "../components/suggestions/SuggestionCard";
import { AcceptModal } from "../components/suggestions/AcceptModal";
import { DismissModal } from "../components/suggestions/DismissModal";
import { useMACCData, useInitiative, useDeleteInitiative } from "../hooks/useInitiatives";
import { useRequestSuggestions, useAcceptSuggestion, useDismissSuggestion } from "../hooks/useSuggestions";
import type { Initiative } from "../types/initiatives";
import type { SuggestionRequest as RequestParams, SuggestionDetail, SuggestionAccept } from "../types/suggestions";

export function MACCPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showCreationChoice, setShowCreationChoice] = useState(false);

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
          onClick={() => setShowCreationChoice(true)}
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

      {/* Creation choice modal */}
      {showCreationChoice && (
        <CreationChoiceModal
          onClose={() => setShowCreationChoice(false)}
          onManual={() => {
            setShowCreationChoice(false);
            setShowCreate(true);
          }}
          onAI={() => {
            setShowCreationChoice(false);
            setShowAI(true);
          }}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <InitiativeForm
          onClose={() => setShowCreate(false)}
          onSaved={(saved) => {
            setSelectedId(saved.id);
          }}
        />
      )}

      {/* AI suggestions modal */}
      {showAI && (
        <AISuggestionsModal
          onClose={() => setShowAI(false)}
          onInitiativeCreated={(id) => {
            setSelectedId(id);
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

function CreationChoiceModal({
  onClose,
  onManual,
  onAI,
}: {
  onClose: () => void;
  onManual: () => void;
  onAI: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            New Initiative
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose how you'd like to create an initiative
          </p>
        </div>

        <div className="space-y-3">
          {/* Manual option */}
          <button
            onClick={onManual}
            className="w-full rounded-lg border-2 border-gray-200 bg-white p-4 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Create manually</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  Enter initiative details yourself with full control over all fields
                </p>
              </div>
            </div>
          </button>

          {/* AI option */}
          <button
            onClick={onAI}
            className="w-full rounded-lg border-2 border-gray-200 bg-white p-4 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Ask AI to suggest</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  Get AI-powered suggestions based on your emissions data and context
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AISuggestionsModal({
  onClose,
  onInitiativeCreated,
}: {
  onClose: () => void;
  onInitiativeCreated: (id: string) => void;
}) {
  const [suggestionResponse, setSuggestionResponse] = useState<any>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const requestMutation = useRequestSuggestions();
  const acceptMutation = useAcceptSuggestion();
  const dismissMutation = useDismissSuggestion();

  async function handleRequestSuggestions(params: RequestParams) {
    try {
      const response = await requestMutation.mutateAsync(params);
      setSuggestionResponse(response);
    } catch (error) {
      console.error("Failed to request suggestions:", error);
    }
  }

  async function handleAccept(suggestionId: string, overrides: SuggestionAccept) {
    try {
      const result = await acceptMutation.mutateAsync({
        suggestionId,
        accept: overrides,
      });

      // Select the first created initiative
      if (result.initiatives.length > 0) {
        onInitiativeCreated(result.initiatives[0].id);
      }

      onClose();
    } catch (error) {
      console.error("Failed to accept suggestion:", error);
    }
  }

  async function handleDismiss(suggestionId: string, reason: string) {
    try {
      await dismissMutation.mutateAsync({
        suggestionId,
        dismiss: { reason },
      });

      // Remove dismissed suggestion from the list
      if (suggestionResponse) {
        setSuggestionResponse({
          ...suggestionResponse,
          suggestions: suggestionResponse.suggestions.filter(
            (s: SuggestionDetail) => s.id !== suggestionId
          ),
        });
      }

      setDismissingId(null);
    } catch (error) {
      console.error("Failed to dismiss suggestion:", error);
    }
  }

  const showingRequest = !suggestionResponse;
  const acceptingSuggestion = acceptingId
    ? suggestionResponse?.suggestions.find((s: SuggestionDetail) => s.id === acceptingId)
    : null;
  const dismissingSuggestion = dismissingId
    ? suggestionResponse?.suggestions.find((s: SuggestionDetail) => s.id === dismissingId)
    : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                AI-Powered Suggestions
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {showingRequest
                  ? "Configure your request"
                  : `${suggestionResponse.suggestions.length} suggestions generated`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {showingRequest ? (
              <SuggestionRequest
                onSubmit={handleRequestSuggestions}
                onCancel={onClose}
                isLoading={requestMutation.isPending}
              />
            ) : (
              <div className="space-y-4">
                {/* Context info */}
                {suggestionResponse.context_used && (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Context Used</p>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-gray-500">Industry:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {suggestionResponse.context_used.industry_sector || "Not specified"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Emissions:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {suggestionResponse.context_used.total_emissions_co2e.toLocaleString("en-GB", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}{" "}
                          tCO₂e
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Sources:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {suggestionResponse.context_used.source_count}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Constraints relaxed warning */}
                {suggestionResponse.constraints_relaxed && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                    <div className="flex gap-3">
                      <svg className="flex-shrink-0 h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-amber-900">Constraints Relaxed</p>
                        <p className="text-sm text-amber-800 mt-1">
                          {suggestionResponse.constraints_relaxed.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggestions list */}
                {suggestionResponse.suggestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <svg className="h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-900">No suggestions available</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your request parameters</p>
                    <button
                      onClick={() => setSuggestionResponse(null)}
                      className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      New Request
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {suggestionResponse.suggestions.map((suggestion: SuggestionDetail) => (
                        <SuggestionCard
                          key={suggestion.id}
                          suggestion={suggestion}
                          onAccept={(id) => setAcceptingId(id)}
                          onModifyAndAccept={(id) => setAcceptingId(id)}
                          onDismiss={(id) => setDismissingId(id)}
                          disabled={acceptMutation.isPending || dismissMutation.isPending}
                        />
                      ))}
                    </div>

                    {/* New request button */}
                    <div className="flex justify-center pt-4">
                      <button
                        onClick={() => setSuggestionResponse(null)}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Request New Suggestions
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accept modal */}
      {acceptingSuggestion && (
        <AcceptModal
          suggestion={acceptingSuggestion}
          onClose={() => setAcceptingId(null)}
          onConfirm={(overrides) => handleAccept(acceptingSuggestion.id, overrides)}
          isLoading={acceptMutation.isPending}
        />
      )}

      {/* Dismiss modal */}
      {dismissingSuggestion && (
        <DismissModal
          suggestionName={dismissingSuggestion.name}
          onClose={() => setDismissingId(null)}
          onConfirm={(reason) => handleDismiss(dismissingSuggestion.id, reason)}
          isLoading={dismissMutation.isPending}
        />
      )}
    </>
  );
}
