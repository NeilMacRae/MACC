/**
 * TanStack Query v5 hooks for the initiatives API.
 *
 * All mutations use optimistic updates where applicable and
 * invalidate the relevant query keys on success.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { api } from "../services/api";
import type {
  BulkValidateResponse,
  Initiative,
  InitiativeCreate,
  InitiativeFilters,
  InitiativeListResponse,
  InitiativeUpdate,
  MACCData,
  OverlapResponse,
  StatusUpdate,
} from "../types/initiatives";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const initiativeKeys = {
  all: ["initiatives"] as const,
  lists: () => [...initiativeKeys.all, "list"] as const,
  list: (filters: InitiativeFilters) =>
    [...initiativeKeys.lists(), filters] as const,
  details: () => [...initiativeKeys.all, "detail"] as const,
  detail: (id: string) => [...initiativeKeys.details(), id] as const,
  overlap: (id: string) => [...initiativeKeys.all, "overlap", id] as const,
  macc: (filters?: { status?: string; initiative_type?: string }) =>
    [...initiativeKeys.all, "macc", filters ?? {}] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildParams(
  filters: InitiativeFilters,
): Record<string, string | number | boolean | undefined | null> {
  return {
    status: filters.status,
    initiative_type: filters.initiative_type,
    scope: filters.scope,
    sort_by: filters.sort_by,
    sort_order: filters.sort_order,
    page: filters.page,
    page_size: filters.page_size,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useInitiatives(
  filters: InitiativeFilters = {},
): UseQueryResult<InitiativeListResponse> {
  return useQuery({
    queryKey: initiativeKeys.list(filters),
    queryFn: () =>
      api.get<InitiativeListResponse>("/initiatives", buildParams(filters)),
  });
}

export function useInitiative(
  id: string | null,
): UseQueryResult<Initiative> {
  return useQuery({
    queryKey: initiativeKeys.detail(id ?? ""),
    queryFn: () => api.get<Initiative>(`/initiatives/${id}`),
    enabled: !!id,
  });
}

export function useOverlap(
  id: string | null,
): UseQueryResult<OverlapResponse> {
  return useQuery({
    queryKey: initiativeKeys.overlap(id ?? ""),
    queryFn: () => api.get<OverlapResponse>(`/initiatives/${id}/overlap`),
    enabled: !!id,
  });
}

export function useMACCData(
  filters: { status?: string; initiative_type?: string } = {},
): UseQueryResult<MACCData> {
  return useQuery({
    queryKey: initiativeKeys.macc(filters),
    queryFn: () =>
      api.get<MACCData>("/initiatives/macc", {
        status: filters.status,
        initiative_type: filters.initiative_type,
      }),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateInitiative(): UseMutationResult<
  Initiative,
  Error,
  InitiativeCreate
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InitiativeCreate) =>
      api.post<Initiative>("/initiatives", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: initiativeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: initiativeKeys.macc() });
    },
  });
}

export function useUpdateInitiative(): UseMutationResult<
  Initiative,
  Error,
  { id: string; payload: InitiativeUpdate }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      api.put<Initiative>(`/initiatives/${id}`, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(initiativeKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: initiativeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: initiativeKeys.macc() });
    },
  });
}

export function useDeleteInitiative(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/initiatives/${id}`),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: initiativeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: initiativeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: initiativeKeys.macc() });
    },
  });
}

export function useUpdateStatus(): UseMutationResult<
  Initiative,
  Error,
  { id: string; payload: StatusUpdate }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      api.patch<Initiative>(`/initiatives/${id}/status`, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(initiativeKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: initiativeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: initiativeKeys.macc() });
    },
  });
}

export function useBulkValidate(): UseMutationResult<
  BulkValidateResponse,
  Error,
  string[]
> {
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.post<BulkValidateResponse>("/initiatives/bulk-validate", {
        initiative_ids: ids,
      }),
  });
}
