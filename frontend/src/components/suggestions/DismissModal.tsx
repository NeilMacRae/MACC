/**
 * DismissModal — Modal for dismissing an AI suggestion with a reason
 */

import { useState } from "react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Dismiss Suggestion
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Please provide a reason for dismissing "{suggestionName}"
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>
            <textarea
              id="reason"
              rows={4}
              required
              placeholder="e.g., Not feasible for our facility, too expensive, already implemented..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Dismissing..." : "Dismiss"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
