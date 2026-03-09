/**
 * TargetsTab — Extracted from ContextPage.tsx for the MACC Modelling hub.
 *
 * Contains: TargetList, TargetForm modal.
 * Always available regardless of whether an org context record exists (FR-015).
 * Shows ContextNotSetMessage informational banner when context is absent.
 *
 * Data dependencies: targets data (always available); useContext (optional)
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TargetList } from '../targets/TargetList';
import { TargetForm } from '../targets/TargetForm';
import { ContextNotSetMessage } from './ContextNotSetMessage';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { api, ApiClientError } from '../../services/api';
import type { OrgContext, TargetListResponse } from '../../types/scenarios';

export function TargetsTab() {
  const queryClient = useQueryClient();
  const [showAddTarget, setShowAddTarget] = useState(false);

  // Load context — used only to decide whether to show the informational banner.
  // Does NOT gate target CRUD (FR-015).
  const { data: context } = useQuery<OrgContext | null>({
    queryKey: ['context'],
    queryFn: async () => {
      try {
        return await api.get<OrgContext>('/context');
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) return null;
        throw err;
      }
    },
  });

  // Load targets — always enabled (not gated on context existing)
  const { data: targetsData, isLoading: targetsLoading } = useQuery<TargetListResponse>({
    queryKey: ['context', 'targets'],
    queryFn: () => api.get<TargetListResponse>('/context/targets'),
  });

  const contextMissing = context === null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Emission Targets</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Define milestone targets for 2030, 2040, net-zero, etc.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddTarget(true)}>
          + Add target
        </Button>
      </div>

      {/* Informational banner — shown when context not set (does NOT block CRUD) */}
      {contextMissing && <ContextNotSetMessage />}

      {/* Target list */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {targetsLoading && (
          <div className="text-sm text-gray-600 py-8 text-center">Loading targets…</div>
        )}

        {!targetsLoading && targetsData && (
          <TargetList
            targets={targetsData.items}
            onTargetDeleted={() =>
              queryClient.invalidateQueries({ queryKey: ['context', 'targets'] })
            }
          />
        )}
      </div>

      {/* Add target modal */}
      <Modal
        open={showAddTarget}
        onClose={() => setShowAddTarget(false)}
        title="Add emission target"
      >
        <TargetForm
          onSaved={() => {
            setShowAddTarget(false);
            queryClient.invalidateQueries({ queryKey: ['context', 'targets'] });
          }}
          onCancel={() => setShowAddTarget(false)}
        />
      </Modal>
    </div>
  );
}
