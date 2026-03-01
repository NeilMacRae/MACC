/**
 * SuggestionRequest — AI suggestion request UI component
 *
 * Provides a form for users to request AI-generated initiative suggestions
 * with controls for priority mode, scope focus, budget limits, etc.
 */

import { useState } from "react";
import type { Priority, SuggestionRequest as RequestParams } from "../../types/suggestions";

interface SuggestionRequestProps {
  onSubmit: (params: RequestParams) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function SuggestionRequest({
  onSubmit,
  onCancel,
  isLoading,
}: SuggestionRequestProps) {
  const [priority, setPriority] = useState<Priority>("cost_effective");
  const [scopeFocus, setScopeFocus] = useState<number[]>([]);
  const [maxSuggestions, setMaxSuggestions] = useState(5);
  const [budgetLimit, setBudgetLimit] = useState<number | undefined>();
  const [additionalContext, setAdditionalContext] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const params: RequestParams = {
      priority,
      max_suggestions: maxSuggestions,
    };

    if (scopeFocus.length > 0) {
      params.scope_focus = scopeFocus;
    }
    if (budgetLimit && budgetLimit > 0) {
      params.budget_limit_gbp = budgetLimit;
    }
    if (additionalContext.trim()) {
      params.additional_context = additionalContext.trim();
    }

    onSubmit(params);
  }

  function toggleScope(scope: number) {
    setScopeFocus((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Priority mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Priority Mode
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPriority("cost_effective")}
            className={`rounded-lg border-2 p-3 text-left transition-colors ${
              priority === "cost_effective"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="font-medium text-gray-900">Cost-Focused</div>
            <div className="mt-1 text-xs text-gray-500">
              Prioritize initiatives with lowest cost per tonne
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPriority("high_impact")}
            className={`rounded-lg border-2 p-3 text-left transition-colors ${
              priority === "high_impact"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="font-medium text-gray-900">Highest-Impact</div>
            <div className="mt-1 text-xs text-gray-500">
              Prioritize initiatives with largest CO₂e reduction
            </div>
          </button>
        </div>
      </div>

      {/* Scope focus */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Scope Focus
          <span className="ml-1 text-xs font-normal text-gray-500">(optional)</span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3].map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => toggleScope(scope)}
              className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                scopeFocus.includes(scope)
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              Scope {scope}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Leave empty to consider all scopes
        </p>
      </div>

      {/* Max suggestions slider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Suggestions: {maxSuggestions}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={maxSuggestions}
          onChange={(e) => setMaxSuggestions(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1</span>
          <span>10</span>
        </div>
      </div>

      {/* Budget limit */}
      <div>
        <label htmlFor="budget-limit" className="block text-sm font-medium text-gray-700 mb-2">
          Budget Limit (£)
          <span className="ml-1 text-xs font-normal text-gray-500">(optional)</span>
        </label>
        <input
          id="budget-limit"
          type="number"
          min="0"
          step="1000"
          placeholder="No limit"
          value={budgetLimit ?? ""}
          onChange={(e) => setBudgetLimit(e.target.value ? parseInt(e.target.value, 10) : undefined)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Only suggest initiatives within this budget
        </p>
      </div>

      {/* Additional context */}
      <div>
        <label htmlFor="additional-context" className="block text-sm font-medium text-gray-700 mb-2">
          Additional Context
          <span className="ml-1 text-xs font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id="additional-context"
          rows={3}
          placeholder="E.g., focus on renewable energy, must be implementable within 6 months..."
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Generating suggestions...
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                This typically takes 5-15 seconds
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Generating..." : "Get Suggestions"}
        </button>
      </div>
    </form>
  );
}
