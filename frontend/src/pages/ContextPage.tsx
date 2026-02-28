/**
 * ContextPage — Organisational context profile editor.
 *
 * Loads existing context (if any) via GET /context.
 * Saves via PUT /context (upsert).
 * Also shows emission targets (TargetList) below the form.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "../components/layout/Header";
import { ContextForm } from "../components/context/ContextForm";
import { TargetList } from "../components/targets/TargetList";
import { TargetForm } from "../components/targets/TargetForm";
import { api, ApiClientError } from "../services/api";
import type { OrgContext, OrgContextUpsert, TargetListResponse } from "../types/scenarios";

export function ContextPage() {
  const queryClient = useQueryClient();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAddTarget, setShowAddTarget] = useState(false);

  // Load context
  const {
    data: context,
    isLoading,
    isError,
  } = useQuery<OrgContext | null>({
    queryKey: ["context"],
    queryFn: async () => {
      try {
        return await api.get<OrgContext>("/context");
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) return null;
        throw err;
      }
    },
  });

  // Load targets
  const { data: targetsData } = useQuery<TargetListResponse>({
    queryKey: ["context", "targets"],
    queryFn: () => api.get<TargetListResponse>("/context/targets"),
    enabled: context !== null,
  });

  // Upsert context
  const upsertMutation = useMutation({
    mutationFn: (data: OrgContextUpsert) =>
      api.put<OrgContext>("/context", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["context"] });
      setSaveSuccess(true);
      setSaveError(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: unknown) => {
      setSaveError(err instanceof Error ? err.message : "Save failed");
      setSaveSuccess(false);
    },
  });

  return (
    <>
      <Header
        title="Organisational Context"
        subtitle="Profile your organisation for AI suggestions and reporting"
      />

      <div className="p-6 max-w-3xl space-y-8">
        {/* Context form card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Organisation profile
          </h2>

          {isLoading && (
            <div className="text-sm text-gray-400 py-8 text-center">
              Loading context…
            </div>
          )}
          {isError && (
            <div className="text-sm text-red-500 py-4">
              Failed to load context. You can still save a new profile.
            </div>
          )}

          {!isLoading && (
            <ContextForm
              initial={context ?? null}
              onSave={(data) => upsertMutation.mutateAsync(data).then(() => {})}
              isSaving={upsertMutation.isPending}
            />
          )}

          {saveSuccess && (
            <div className="mt-3 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              ✓ Context saved successfully
            </div>
          )}
          {saveError && (
            <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {saveError}
            </div>
          )}
        </div>

        {/* Emission targets */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">
                Emission reduction targets
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Define milestone targets for 2030, 2040, net-zero, etc.
              </p>
            </div>
            <button
              onClick={() => setShowAddTarget(true)}
              disabled={!context}
              title={!context ? "Save context first to add targets" : undefined}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Add target
            </button>
          </div>

          {!context && (
            <p className="text-sm text-gray-400 py-4 text-center">
              Save your organisation profile above to add emission targets.
            </p>
          )}

          {context && targetsData && (
            <TargetList
              targets={targetsData.items}
              onTargetDeleted={() =>
                queryClient.invalidateQueries({ queryKey: ["context", "targets"] })
              }
            />
          )}

          {context && !targetsData && (
            <div className="text-sm text-gray-400 py-4 text-center">
              Loading targets…
            </div>
          )}
        </div>

        {/* Add target modal */}
        {showAddTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Add emission target
                </h3>
                <button
                  onClick={() => setShowAddTarget(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <TargetForm
                  onSaved={() => {
                    setShowAddTarget(false);
                    queryClient.invalidateQueries({
                      queryKey: ["context", "targets"],
                    });
                  }}
                  onCancel={() => setShowAddTarget(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
