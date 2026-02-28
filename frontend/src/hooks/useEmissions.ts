// ─── useEmissions — TanStack Query v5 hooks ───────────────────────────────────
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  EmissionsOverview,
  HierarchyResponse,
  MarketFactorType,
  SourceListResponse,
  TrendData,
  UnitDetail,
} from '../types/emissions';

// ── Query key factory ─────────────────────────────────────────────────────────
export const emissionsKeys = {
  all: ['emissions'] as const,
  overview: (year?: number, mft?: MarketFactorType) =>
    [...emissionsKeys.all, 'overview', year, mft] as const,
  hierarchy: (year?: number, mft?: MarketFactorType, parentId?: string) =>
    [...emissionsKeys.all, 'hierarchy', year, mft, parentId] as const,
  unit: (unitId: string, year?: number, mft?: MarketFactorType) =>
    [...emissionsKeys.all, 'unit', unitId, year, mft] as const,
  trends: (unitId?: string, scope?: number, mft?: MarketFactorType) =>
    [...emissionsKeys.all, 'trends', unitId, scope, mft] as const,
  sources: (year?: number, scope?: number, qg?: string, mft?: MarketFactorType) =>
    [...emissionsKeys.all, 'sources', year, scope, qg, mft] as const,
};

// ── Overview ──────────────────────────────────────────────────────────────────
export function useEmissionsOverview(year?: number, mft: MarketFactorType = 'Location') {
  return useQuery({
    queryKey: emissionsKeys.overview(year, mft),
    queryFn: () =>
      api.get<EmissionsOverview>('/emissions/overview', {
        year,
        market_factor_type: mft,
      }),
    staleTime: 60_000,
  });
}

// ── Hierarchy ─────────────────────────────────────────────────────────────────
export function useHierarchy(
  year?: number,
  mft: MarketFactorType = 'Location',
  parentId?: string,
) {
  return useQuery({
    queryKey: emissionsKeys.hierarchy(year, mft, parentId),
    queryFn: () =>
      api.get<HierarchyResponse>('/emissions/hierarchy', {
        reporting_year: year,
        market_factor_type: mft,
        parent_id: parentId,
      }),
    staleTime: 60_000,
  });
}

// ── Unit detail ───────────────────────────────────────────────────────────────
export function useUnitDetail(
  unitId: string | null,
  year?: number,
  mft: MarketFactorType = 'Location',
) {
  return useQuery({
    queryKey: emissionsKeys.unit(unitId ?? '', year, mft),
    queryFn: () =>
      api.get<UnitDetail>(`/emissions/units/${unitId}`, {
        year,
        market_factor_type: mft,
      }),
    enabled: !!unitId,
    staleTime: 60_000,
  });
}

// ── Trends ────────────────────────────────────────────────────────────────────
export function useTrends(
  unitId?: string,
  scope?: number,
  mft: MarketFactorType = 'Location',
) {
  return useQuery({
    queryKey: emissionsKeys.trends(unitId, scope, mft),
    queryFn: () =>
      api.get<TrendData>('/emissions/trends', {
        unit_id: unitId,
        scope,
        market_factor_type: mft,
      }),
    staleTime: 60_000,
  });
}

// ── Sources ───────────────────────────────────────────────────────────────────
export function useSources(
  year?: number,
  scope?: number,
  questionGroup?: string,
  mft: MarketFactorType = 'Location',
) {
  return useQuery({
    queryKey: emissionsKeys.sources(year, scope, questionGroup, mft),
    queryFn: () =>
      api.get<SourceListResponse>('/emissions/sources', {
        year,
        scope,
        question_group: questionGroup,
        market_factor_type: mft,
      }),
    staleTime: 60_000,
  });
}
