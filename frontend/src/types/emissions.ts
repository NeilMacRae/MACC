// ─── Emissions API TypeScript types ───────────────────────────────────────────
// Mirrors contracts/emissions-api.md response schemas

export type MarketFactorType = 'Location' | 'Market';

// ── Overview ──────────────────────────────────────────────────────────────────

export interface ScopeEntry {
  co2e_tonnes: number;
  percentage: number;
}

export interface ByScopeBreakdown {
  scope_1: ScopeEntry;
  scope_2: ScopeEntry;
  scope_3: ScopeEntry;
}

export interface QuestionGroupEntry {
  question_group: string;
  co2e_tonnes: number;
  percentage: number;
}

export interface TopSource {
  source_id: string;
  activity: string;
  question: string;
  question_group: string;
  scope: 1 | 2 | 3;
  co2e_tonnes: number;
  percentage: number;
}

export interface EmissionsOverview {
  organisation_id: string;
  organisation_name: string;
  year: number;
  market_factor_type: MarketFactorType;
  total_co2e_tonnes: number;
  by_scope: ByScopeBreakdown;
  by_question_group: QuestionGroupEntry[];
  top_sources: TopSource[];
  available_years: number[];
}

// ── Hierarchy ─────────────────────────────────────────────────────────────────

export interface HierarchyNode {
  id: string;
  company_unit_id: number;
  company_unit_name: string;
  company_unit_type: 'division' | 'site';
  facility_type: string | null;
  country: string | null;
  country_code: string | null;
  total_co2e_tonnes: number;
  children: HierarchyNode[];
}

export interface HierarchyResponse {
  root: HierarchyNode;
  reporting_year: number;
}

// ── Unit Detail ───────────────────────────────────────────────────────────────

export interface ChildUnitSummary {
  id: string;
  company_unit_name: string;
  company_unit_type: 'division' | 'site';
  total_co2e_tonnes: number;
}

export interface RecordDetail {
  id: string;
  year: number;
  month: number;
  scope: 1 | 2 | 3;
  market_factor_type: MarketFactorType;
  value: number;
  co2e_kg: number;
  quality: string | null;
  upstream: string;
  upstream_name: string | null;
}

export interface SourceDetail {
  id: string;
  answer_id: number;
  activity: string;
  question: string;
  question_group: string;
  answer_unit: string;
  co2e_tonnes: number;
  scopes: number[];
  quality?: 'Actual' | 'Estimated' | 'Missing';
  records: RecordDetail[];
}

export interface UnitDetail {
  id: string;
  company_unit_id: number;
  company_unit_name: string;
  company_unit_type: 'division' | 'site';
  facility_type: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  market_factor_type: MarketFactorType;
  total_co2e_tonnes: number;
  by_scope: ByScopeBreakdown;
  by_question_group: QuestionGroupEntry[];
  top_sources: TopSource[];
  child_units: ChildUnitSummary[];
  sources: SourceDetail[];
}

// ── Trends ────────────────────────────────────────────────────────────────────

export interface TrendPoint {
  year: number;
  co2e_tonnes: number;
}

export interface TrendData {
  unit_id: string | null;
  company_unit_name: string;
  market_factor_type: MarketFactorType;
  trends: TrendPoint[];
}

// ── Sources list ──────────────────────────────────────────────────────────────

export interface EmissionSourceSummary {
  id: string;
  answer_id: number;
  activity: string;
  question: string;
  question_group: string;
  answer_unit: string;
  company_unit_id: string;
  company_unit_name: string;
  company_unit_type: 'division' | 'site';
  co2e_tonnes: number;
  scopes: number[];
}

export interface SourceListResponse {
  sources: EmissionSourceSummary[];
}
