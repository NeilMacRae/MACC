/**
 * SuggestionRequest — AI suggestion request UI component
 *
 * Provides a form for users to request AI-generated initiative suggestions
 * with controls for priority mode, scope focus, budget limits, etc.
 */

import { useState } from "react";
import {
  PrismInput,
  PrismTextarea,
} from "../../prism";
import { Button } from "../common/Button";
import { LoadingSpinner } from "../layout/LoadingSpinner";
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
          <Button
            type="button"
            variant={priority === "cost_effective" ? "primary" : "secondary"}
            disabled={isLoading}
            onClick={() => setPriority("cost_effective")}
          >
            <div className="text-left">
              <div className="font-medium">Cost-Focused</div>
              <div className="mt-1 text-xs opacity-80">
                Prioritize initiatives with lowest cost per tonne
              </div>
            </div>
          </Button>
          <Button
            type="button"
            variant={priority === "high_impact" ? "primary" : "secondary"}
            disabled={isLoading}
            onClick={() => setPriority("high_impact")}
          >
            <div className="text-left">
              <div className="font-medium">Highest-Impact</div>
              <div className="mt-1 text-xs opacity-80">
                Prioritize initiatives with largest CO₂e reduction
              </div>
            </div>
          </Button>
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
            <Button
              key={scope}
              type="button"
              variant={scopeFocus.includes(scope) ? "primary" : "secondary"}
              size="sm"
              onClick={() => toggleScope(scope)}
            >
              Scope {scope}
            </Button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Leave empty to consider all scopes
        </p>
      </div>

      {/* Max suggestions */}
      <div>
        <label htmlFor="max-suggestions" className="block text-sm font-medium text-gray-700 mb-2">
          Number of Suggestions
        </label>
        <PrismInput
          id="max-suggestions"
          type="number"
          min={1}
          max={10}
          step={1}
          value={maxSuggestions}
          onInput={(e) =>
            setMaxSuggestions(parseInt((e.target as HTMLInputElement).value, 10))
          }
        />
        <p className="mt-1 text-xs text-gray-500">Between 1 and 10.</p>
      </div>

      {/* Budget limit */}
      <div>
        <label htmlFor="budget-limit" className="block text-sm font-medium text-gray-700 mb-2">
          Budget Limit (£)
          <span className="ml-1 text-xs font-normal text-gray-500">(optional)</span>
        </label>
        <PrismInput
          id="budget-limit"
          type="number"
          min={0}
          step={1000}
          placeholder="No limit"
          value={budgetLimit ?? ""}
          onInput={(e) => {
            const v = (e.target as HTMLInputElement).value;
            setBudgetLimit(v ? parseInt(v, 10) : undefined);
          }}
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
        <PrismTextarea
          id="additional-context"
          rows={3}
          placeholder="E.g., focus on renewable energy, must be implementable within 6 months..."
          value={additionalContext}
          onInput={(e) => setAdditionalContext((e.target as HTMLTextAreaElement).value)}
        />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="rounded-lg border border-[var(--core-color-primary-200,#bfdbfe)] bg-[var(--core-color-primary-50,#eff6ff)] p-4">
          <div className="flex items-center gap-4">
            <LoadingSpinner size="sm" label="" />
            <div>
              <p className="text-sm font-medium text-[var(--core-color-primary-900,#1e3a8a)]">
                Generating suggestions...
              </p>
              <p className="mt-0.5 text-xs text-[var(--core-color-primary-700,#1d4ed8)]">
                This typically takes 5-15 seconds
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-end pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          loading={isLoading}
        >
          {isLoading ? "Generating..." : "Get Suggestions"}
        </Button>
      </div>
    </form>
  );
}
