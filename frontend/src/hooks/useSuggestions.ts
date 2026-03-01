// ── useSuggestions Hook ───────────────────────────────────────────────────────
import { useMutation, useQuery, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  SuggestionRequest,
  SuggestionResponse,
  SuggestionListResponse,
  SuggestionAccept,
  SuggestionAcceptResponse,
  SuggestionDismiss,
  SuggestionDismissResponse,
  ConstraintConfig,
  ConstraintConfigResponse,
} from '../types/suggestions';

// ── Request Suggestions ────────────────────────────────────────────────────────

export function useRequestSuggestions(): UseMutationResult<
  SuggestionResponse,
  Error,
  SuggestionRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SuggestionRequest) => {
      return api.post<SuggestionResponse>('/ai/suggestions', request);
    },
    onSuccess: () => {
      // Invalidate suggestion history
      queryClient.invalidateQueries({ queryKey: ['suggestions', 'history'] });
    },
  });
}

// ── Suggestion History ─────────────────────────────────────────────────────────

export function useSuggestionHistory(
  page: number = 1,
  pageSize: number = 20
): UseQueryResult<SuggestionListResponse, Error> {
  return useQuery({
    queryKey: ['suggestions', 'history', page, pageSize],
    queryFn: async () => {
      return api.get<SuggestionListResponse>(`/ai/suggestions?page=${page}&page_size=${pageSize}`);
    },
  });
}

// ── Suggestion Detail ──────────────────────────────────────────────────────────

export function useSuggestionDetail(
  requestId: string | null
): UseQueryResult<SuggestionResponse, Error> {
  return useQuery({
    queryKey: ['suggestions', 'detail', requestId],
    queryFn: async () => {
      if (!requestId) throw new Error('Request ID required');
      return api.get<SuggestionResponse>(`/ai/suggestions/${requestId}`);
    },
    enabled: !!requestId,
  });
}

// ── Accept Suggestion ──────────────────────────────────────────────────────────

export function useAcceptSuggestion(): UseMutationResult<
  SuggestionAcceptResponse,
  Error,
  { suggestionId: string; accept: SuggestionAccept }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestionId, accept }) => {
      return api.post<SuggestionAcceptResponse>(
        `/ai/suggestions/${suggestionId}/accept`,
        accept
      );
    },
    onSuccess: () => {
      // Invalidate initiatives (new ones created)
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      // Invalidate suggestion history
      queryClient.invalidateQueries({ queryKey: ['suggestions', 'history'] });
      // Invalidate MACC data
      queryClient.invalidateQueries({ queryKey: ['macc'] });
      // Invalidate scenarios if added to scenarios
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });
}

// ── Dismiss Suggestion ─────────────────────────────────────────────────────────

export function useDismissSuggestion(): UseMutationResult<
  SuggestionDismissResponse,
  Error,
  { suggestionId: string; dismiss: SuggestionDismiss }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestionId, dismiss }) => {
      return api.post<SuggestionDismissResponse>(
        `/ai/suggestions/${suggestionId}/dismiss`,
        dismiss
      );
    },
    onSuccess: () => {
      // Invalidate suggestion history
      queryClient.invalidateQueries({ queryKey: ['suggestions', 'history'] });
    },
  });
}

// ── Constraints Configuration ──────────────────────────────────────────────────

export function useConstraints(): UseQueryResult<ConstraintConfigResponse, Error> {
  return useQuery({
    queryKey: ['suggestions', 'constraints'],
    queryFn: async () => {
      return api.get<ConstraintConfigResponse>('/ai/constraints');
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (no constraints configured)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useUpdateConstraints(): UseMutationResult<
  ConstraintConfigResponse,
  Error,
  ConstraintConfig
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: ConstraintConfig) => {
      return api.put<ConstraintConfigResponse>('/ai/constraints', config);
    },
    onSuccess: () => {
      // Invalidate constraints query
      queryClient.invalidateQueries({ queryKey: ['suggestions', 'constraints'] });
    },
  });
}
