/**
 * TanStack Query v5 hooks for the scenarios API.
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
  AddInitiativesRequest,
  CompareResponse,
  ReorderRequest,
  Scenario,
  ScenarioCreate,
  ScenarioDetail,
  ScenarioListResponse,
  ScenarioMACCData,
  ScenarioUpdate,
} from "../types/scenarios";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const scenarioKeys = {
  all: ["scenarios"] as const,
  lists: () => [...scenarioKeys.all, "list"] as const,
  details: () => [...scenarioKeys.all, "detail"] as const,
  detail: (id: string) => [...scenarioKeys.details(), id] as const,
  macc: (id: string) => [...scenarioKeys.all, "macc", id] as const,
  compare: (ids: string[]) => [...scenarioKeys.all, "compare", ids.join(",")] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useScenarios(): UseQueryResult<ScenarioListResponse> {
  return useQuery({
    queryKey: scenarioKeys.lists(),
    queryFn: () => api.get<ScenarioListResponse>("/scenarios"),
  });
}

export function useScenario(id: string | null): UseQueryResult<ScenarioDetail> {
  return useQuery({
    queryKey: scenarioKeys.detail(id ?? ""),
    queryFn: () => api.get<ScenarioDetail>(`/scenarios/${id}`),
    enabled: !!id,
  });
}

export function useMACCData(scenarioId: string | null): UseQueryResult<ScenarioMACCData> {
  return useQuery({
    queryKey: scenarioKeys.macc(scenarioId ?? ""),
    queryFn: () => api.get<ScenarioMACCData>(`/scenarios/${scenarioId}/macc-data`),
    enabled: !!scenarioId,
  });
}

export function useCompareScenarios(
  ids: string[]
): UseQueryResult<CompareResponse> {
  return useQuery({
    queryKey: scenarioKeys.compare(ids),
    queryFn: () =>
      api.get<CompareResponse>("/scenarios/compare", {
        scenario_ids: ids.join(","),
      }),
    enabled: ids.length >= 2,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateScenario(): UseMutationResult<Scenario, Error, ScenarioCreate> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ScenarioCreate) =>
      api.post<Scenario>("/scenarios", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scenarioKeys.lists() });
    },
  });
}

export function useUpdateScenario(): UseMutationResult<
  Scenario,
  Error,
  { id: string; data: ScenarioUpdate }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.put<Scenario>(`/scenarios/${id}`, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: scenarioKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scenarioKeys.detail(id) });
    },
  });
}

export function useDeleteScenario(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/scenarios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scenarioKeys.lists() });
    },
  });
}

export function useAddInitiatives(): UseMutationResult<
  ScenarioDetail,
  Error,
  { scenarioId: string; data: AddInitiativesRequest }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scenarioId, data }) =>
      api.post<ScenarioDetail>(`/scenarios/${scenarioId}/initiatives`, data),
    onSuccess: (_result, { scenarioId }) => {
      queryClient.invalidateQueries({ queryKey: scenarioKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scenarioKeys.detail(scenarioId) });
      queryClient.invalidateQueries({ queryKey: scenarioKeys.macc(scenarioId) });
    },
  });
}

export function useRemoveInitiative(): UseMutationResult<
  void,
  Error,
  { scenarioId: string; initiativeId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scenarioId, initiativeId }) =>
      api.delete(`/scenarios/${scenarioId}/initiatives/${initiativeId}`),
    onSuccess: (_result, { scenarioId }) => {
      queryClient.invalidateQueries({ queryKey: scenarioKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scenarioKeys.detail(scenarioId) });
      queryClient.invalidateQueries({ queryKey: scenarioKeys.macc(scenarioId) });
    },
  });
}

export function useReorderInitiatives(): UseMutationResult<
  ScenarioDetail,
  Error,
  { scenarioId: string; data: ReorderRequest }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scenarioId, data }) =>
      api.patch<ScenarioDetail>(
        `/scenarios/${scenarioId}/initiatives/reorder`,
        data
      ),
    onSuccess: (_result, { scenarioId }) => {
      queryClient.invalidateQueries({ queryKey: scenarioKeys.detail(scenarioId) });
      queryClient.invalidateQueries({ queryKey: scenarioKeys.macc(scenarioId) });
    },
  });
}
