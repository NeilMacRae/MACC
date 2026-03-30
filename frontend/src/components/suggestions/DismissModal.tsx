/**
 * DismissModal — Modal for dismissing an AI suggestion with a reason
 */

import { useState } from "react";
import { PrismTextarea } from "../../prism";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";

interface DismissModalProps {
  suggestionName: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function DismissModal({
  suggestionName,
  onClose,
  onConfirm,
  isLoading = false,
}: DismissModalProps) {
  const [reason, setReason] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  }

  return (
    <Modal
      open
      title="Dismiss Suggestion"
      description={`Please provide a reason for dismissing "${suggestionName}"`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason
          </label>
        <PrismTextarea
          id="reason"
          rows={4}
          required
          placeholder="e.g., Not feasible for our facility, too expensive, already implemented..."
          value={reason}
          onInput={(e) => setReason((e.target as HTMLTextAreaElement).value)}
        />
        </div>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" disabled={isLoading} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={isLoading} disabled={isLoading || !reason.trim()}>
            {isLoading ? "Dismissing..." : "Dismiss"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
