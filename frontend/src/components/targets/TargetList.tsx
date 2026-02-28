/**
 * TargetList — Display emission reduction targets with progress bars.
 *
 * Shows on-track / off-track status, gap in tonnes, years remaining.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import type { Target, TargetProgress } from "../../types/scenarios";

interface TargetListProps {
  targets: Target[];
  onTargetDeleted: () => void;
  scenarioId?: string;
}

function TargetProgressBar({
  targetId,
  scenarioId,
}: {
  targetId: string;
  scenarioId?: string;
}) {
  const { data: progress, isLoading } = useQuery<TargetProgress>({
    queryKey: ["target-progress", targetId, scenarioId ?? "none"],
    queryFn: () =>
      api.get<TargetProgress>(`/context/targets/${targetId}/progress`, {
        scenario_id: scenarioId,
      }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="mt-2 h-2 w-full rounded-full bg-gray-100 animate-pulse" />
    );
  }
  if (!progress) return null;

  // Progress: how much of current emissions are covered by scenario reduction
  const pct = Math.min(100, Math.round(progress.coverage_pct));
  const barColour = progress.on_track
    ? "bg-green-500"
    : pct >= 50
    ? "bg-amber-400"
    : "bg-red-400";

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {progress.on_track ? (
            <span className="text-green-600 font-medium">✓ On track</span>
          ) : (
            <span className="text-red-600 font-medium">
              Gap: {progress.gap_co2e_tonnes.toLocaleString()} tCO₂e
            </span>
          )}
        </span>
        <span>{progress.years_remaining} yrs remaining</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>
          Projected: {progress.projected_co2e_tonnes.toLocaleString()} t
        </span>
        <span>Target: {(progress.target.target_co2e_tonnes ?? 0).toLocaleString()} t</span>
      </div>
    </div>
  );
}

export function TargetList({ targets, onTargetDeleted, scenarioId }: TargetListProps) {
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/context/targets/${id}`),
    onSuccess: onTargetDeleted,
  });

  if (targets.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        No targets defined yet. Add your first emission reduction target above.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {targets.map((t) => (
        <div
          key={t.id}
          className="rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {t.target_year}
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 capitalize">
                  {t.target_type}
                </span>
                {t.source && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                    {t.source}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                <span className="font-medium text-gray-800">
                  {t.target_value_pct}% reduction
                </span>{" "}
                from{" "}
                {t.baseline_co2e_tonnes.toLocaleString()} tCO₂e ({t.baseline_year})
                {t.target_co2e_tonnes != null && (
                  <> → {t.target_co2e_tonnes.toLocaleString()} tCO₂e</>
                )}
              </p>
              {t.scope_coverage && t.scope_coverage.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Scopes: {t.scope_coverage.join(", ")}
                </p>
              )}
              {t.notes && (
                <p className="text-xs text-gray-500 mt-0.5 italic">{t.notes}</p>
              )}
            </div>
            <button
              onClick={() => {
                if (!confirm("Delete this target?")) return;
                deleteMutation.mutate(t.id);
              }}
              disabled={deleteMutation.isPending}
              className="text-xs text-red-500 hover:text-red-700 flex-shrink-0 mt-0.5"
            >
              Delete
            </button>
          </div>

          {/* Progress bar (live from API) */}
          <TargetProgressBar targetId={t.id} scenarioId={scenarioId} />
        </div>
      ))}
    </div>
  );
}
