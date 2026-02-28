/**
 * StatusTransition — compact inline status controls.
 *
 * Renders the valid next-status buttons for an initiative, with a
 * confirmation prompt when transitioning to "rejected".
 */

import { useState } from "react";
import { useUpdateStatus } from "../../hooks/useInitiatives";
import type { Initiative, InitiativeStatus } from "../../types/initiatives";
import { STATUS_TRANSITIONS } from "../../types/initiatives";

interface Props {
  initiative: Initiative;
  onTransitioned?: (updated: Initiative) => void;
}

const STATUS_LABELS: Record<InitiativeStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  approved: "Approved",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

const STATUS_COLOURS: Record<InitiativeStatus, string> = {
  idea: "bg-gray-100 text-gray-700",
  planned: "bg-blue-100 text-blue-700",
  approved: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
};

const NEXT_BUTTON_COLOURS: Record<string, string> = {
  planned: "border-blue-400 text-blue-700 hover:bg-blue-50",
  approved: "border-indigo-400 text-indigo-700 hover:bg-indigo-50",
  in_progress: "border-amber-400 text-amber-700 hover:bg-amber-50",
  completed: "border-emerald-400 text-emerald-700 hover:bg-emerald-50",
  rejected: "border-red-400 text-red-600 hover:bg-red-50",
};

export function StatusTransition({ initiative, onTransitioned }: Props) {
  const mutation = useUpdateStatus();
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const nextStatuses = STATUS_TRANSITIONS[initiative.status] ?? [];

  async function transition(nextStatus: InitiativeStatus, notes?: string) {
    setError(null);
    try {
      const updated = await mutation.mutateAsync({
        id: initiative.id,
        payload: { status: nextStatus, notes: notes || undefined },
      });
      onTransitioned?.(updated);
      setConfirmReject(false);
      setRejectReason("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  return (
    <div className="space-y-2">
      {/* Current status badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOURS[initiative.status]}`}
        >
          {STATUS_LABELS[initiative.status]}
        </span>
        {nextStatuses.length === 0 && (
          <span className="text-xs text-gray-400">(terminal state)</span>
        )}
      </div>

      {/* Transition buttons */}
      {nextStatuses.length > 0 && !confirmReject && (
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((next) => (
            <button
              key={next}
              onClick={() => {
                if (next === "rejected") {
                  setConfirmReject(true);
                } else {
                  transition(next);
                }
              }}
              disabled={mutation.isPending}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${NEXT_BUTTON_COLOURS[next] ?? "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
            >
              → {STATUS_LABELS[next]}
            </button>
          ))}
        </div>
      )}

      {/* Reject confirmation */}
      {confirmReject && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
          <p className="text-xs font-medium text-red-700">
            Confirm rejection?
          </p>
          <textarea
            className="w-full rounded border border-red-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
            rows={2}
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => transition("rejected", rejectReason)}
              disabled={mutation.isPending}
              className="rounded px-3 py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {mutation.isPending ? "Rejecting…" : "Reject"}
            </button>
            <button
              onClick={() => {
                setConfirmReject(false);
                setRejectReason("");
              }}
              className="rounded px-3 py-1 text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
