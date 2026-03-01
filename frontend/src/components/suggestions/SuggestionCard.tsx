/**
 * SuggestionCard — Display card for a single AI-generated initiative suggestion
 *
 * Shows name, description, rationale, estimated metrics, confidence level,
 * assumptions, activity breakdown (for multi-activity suggestions), and action buttons.
 */

import type { SuggestionDetail } from "../../types/suggestions";

interface SuggestionCardProps {
  suggestion: SuggestionDetail;
  onAccept: (id: string) => void;
  onModifyAndAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  disabled?: boolean;
}

export function SuggestionCard({
  suggestion,
  onAccept,
  onModifyAndAccept,
  onDismiss,
  disabled = false,
}: SuggestionCardProps) {
  function fmt(n: number, d = 0) {
    return n.toLocaleString("en-GB", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  const confidenceColor = {
    high: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-red-100 text-red-800 border-red-200",
  }[suggestion.confidence];

  const complexityColor = {
    low: "text-green-600",
    medium: "text-amber-600",
    high: "text-red-600",
  }[suggestion.implementation_complexity];

  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm hover:border-blue-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900 leading-tight">
            {suggestion.name}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${confidenceColor}`}>
              {suggestion.confidence.charAt(0).toUpperCase() + suggestion.confidence.slice(1)} Confidence
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-600">
              Relevance: <span className="font-medium">{Math.round(suggestion.relevance_score * 100)}%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-4">
        {suggestion.description}
      </p>

      {/* Rationale */}
      <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 mb-4">
        <p className="text-xs font-medium text-blue-900 mb-1">Why this suggestion?</p>
        <p className="text-sm text-blue-800">
          {suggestion.rationale}
        </p>
      </div>

      {/* Low confidence warning */}
      {suggestion.confidence === "low" && suggestion.confidence_notes && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
          <div className="flex gap-2">
            <svg className="flex-shrink-0 h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-xs font-medium text-amber-900">Lower Confidence</p>
              <p className="text-xs text-amber-800 mt-0.5">
                {suggestion.confidence_notes}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3 mb-4">
        <Metric label="£/tCO₂e" value={`£${fmt(suggestion.estimated_cost_per_tonne, 0)}`} />
        <Metric label="Abatement" value={`${fmt(suggestion.estimated_co2e_reduction_annual_tonnes, 1)} t/yr`} />
        <Metric label="CapEx" value={`£${fmt(suggestion.estimated_capex_gbp, 0)}`} />
        <Metric 
          label="OpEx" 
          value={suggestion.estimated_opex_annual_gbp < 0 
            ? `−£${fmt(Math.abs(suggestion.estimated_opex_annual_gbp), 0)}/yr`
            : `+£${fmt(suggestion.estimated_opex_annual_gbp, 0)}/yr`
          } 
        />
        <Metric 
          label="Payback" 
          value={suggestion.estimated_payback_years ? `${suggestion.estimated_payback_years} yrs` : "N/A"} 
        />
        <Metric label="Timeline" value={`${suggestion.typical_timeline_months} mo`} />
      </div>

      {/* Activity breakdown (for multi-activity suggestions) */}
      {suggestion.activity_breakdown && suggestion.activity_breakdown.length > 1 && (
        <div className="rounded-lg border border-gray-200 p-3 mb-4">
          <p className="text-xs font-medium text-gray-700 mb-2">
            Multi-Activity Suggestion ({suggestion.activity_breakdown.length} activities)
          </p>
          <div className="space-y-2">
            {suggestion.activity_breakdown.map((breakdown, idx) => (
              <div key={idx} className="rounded bg-gray-50 p-2 text-xs">
                <p className="font-medium text-gray-900">{breakdown.activity}</p>
                <div className="mt-1 flex gap-3 text-gray-600">
                  <span>£{fmt(breakdown.estimated_capex_gbp, 0)}</span>
                  <span>·</span>
                  <span>{fmt(breakdown.estimated_co2e_reduction_annual_tonnes, 1)} t/yr</span>
                  <span>·</span>
                  <span>{breakdown.target_source_ids.length} sources</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Accepting will create {suggestion.activity_breakdown.length} separate initiatives
          </p>
        </div>
      )}

      {/* Additional details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">Implementation Complexity</p>
          <p className={`text-sm font-medium ${complexityColor}`}>
            {suggestion.implementation_complexity.charAt(0).toUpperCase() + suggestion.implementation_complexity.slice(1)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">Target Scopes</p>
          <p className="text-sm text-gray-900">
            {suggestion.target_scopes.map(s => `Scope ${s}`).join(", ")}
          </p>
        </div>
      </div>

      {/* Assumptions */}
      {suggestion.assumptions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Key Assumptions</p>
          <ul className="space-y-1">
            {suggestion.assumptions.map((assumption, idx) => (
              <li key={idx} className="text-xs text-gray-600 flex gap-2">
                <span className="text-gray-400">•</span>
                <span>{assumption}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onAccept(suggestion.id)}
          disabled={disabled}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Accept
        </button>
        <button
          onClick={() => onModifyAndAccept(suggestion.id)}
          disabled={disabled}
          className="flex-1 rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Modify & Accept
        </button>
        <button
          onClick={() => onDismiss(suggestion.id)}
          disabled={disabled}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5">{value}</dd>
    </div>
  );
}
