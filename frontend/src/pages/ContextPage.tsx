/**
 * ContextPage — Organisational context profile editor.
 *
 * Loads existing context (if any) via GET /context.
 * Saves via PUT /context (upsert).
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "../components/layout/Header";
import { ContextForm } from "../components/context/ContextForm";
import { api, ApiClientError } from "../services/api";
import type { OrgContext, OrgContextUpsert } from "../types/scenarios";
import { PrismAlert } from "../prism";

export function ContextPage() {
  const queryClient = useQueryClient();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

      <div
        style={{
          padding: 'var(--alias-space-6, 24px)',
          maxWidth: 768,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--alias-space-8, 32px)',
        }}
      >
        <section
          style={{
            borderRadius: 'var(--alias-border-radius-large, 12px)',
            border: '1px solid var(--alias-color-divider-default, #b1bac5)',
            backgroundColor: 'var(--alias-color-background-surface, #ffffff)',
            padding: 'var(--alias-space-6, 24px)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--alias-font-size-200, 14px)',
              fontWeight: 600,
              marginBottom: 'var(--alias-space-4, 16px)',
            }}
          >
            Organisation profile
          </h2>

          {isLoading && (
              <PrismAlert variant="neutral">Loading context…</PrismAlert>
          )}
          {isError && (
              <PrismAlert variant="danger">
                Failed to load context. You can still save a new profile.
              </PrismAlert>
          )}

          {!isLoading && (
            <ContextForm
              initial={context ?? null}
              onSave={(data) => upsertMutation.mutateAsync(data).then(() => {})}
              isSaving={upsertMutation.isPending}
            />
          )}

          {saveSuccess && (
              <div style={{ marginTop: 'var(--alias-space-3, 12px)' }}>
                <PrismAlert variant="success">Context saved successfully</PrismAlert>
              </div>
          )}
          {saveError && (
              <div style={{ marginTop: 'var(--alias-space-3, 12px)' }}>
                <PrismAlert variant="danger">{saveError}</PrismAlert>
              </div>
          )}
        </section>
      </div>
    </>
  );
}
