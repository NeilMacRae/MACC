/**
 * StatusTransition — compact inline status controls.
 *
 * Renders the valid next-status buttons for an initiative, with a
 * confirmation prompt when transitioning to "rejected".
 */

import { useState } from "react";
import { PrismTextarea } from "../../prism";
import { Button } from "../common/Button";
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
          <span className="text-xs text-gray-600">(terminal state)</span>
        )}
      </div>

      {/* Transition buttons */}
      {nextStatuses.length > 0 && !confirmReject && (
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((next) => (
            <Button
              key={next}
              type="button"
              variant={next === "rejected" ? "danger" : "secondary"}
              size="sm"
              disabled={mutation.isPending}
              onClick={() => {
                if (next === "rejected") {
                  setConfirmReject(true);
                } else {
                  transition(next);
                }
              }}
            >
              → {STATUS_LABELS[next]}
            </Button>
          ))}
        </div>
      )}

      {/* Reject confirmation */}
      {confirmReject && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
          <p className="text-xs font-medium text-red-700">
            Confirm rejection?
          </p>
          <PrismTextarea
            rows={2}
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onInput={(e) => setRejectReason((e.target as HTMLTextAreaElement).value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={mutation.isPending}
              loading={mutation.isPending}
              onClick={() => transition("rejected", rejectReason)}
            >
              {mutation.isPending ? "Rejecting…" : "Reject"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setConfirmReject(false);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
