/**
 * TypeScript types for context, targets, and scenarios.
 * Mirrors backend schemas: context.py, scenarios.py
 * and contracts: context-api.md, scenarios-api.md.
 */

// ---------------------------------------------------------------------------
// Organisational Context
// ---------------------------------------------------------------------------

export type SustainabilityMaturity = "beginner" | "intermediate" | "advanced";
export type TargetType = "absolute" | "intensity";

export interface OrgContext {
  id: string;
  organisation_id: string;
  industry_sector: string | null;
  employee_count: number | null;
  annual_revenue_gbp: number | null;
  operating_geographies: string[] | null;
  sustainability_maturity: SustainabilityMaturity | null;
  budget_constraint_gbp: number | null;
  target_year: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgContextUpsert {
  industry_sector?: string | null;
  employee_count?: number | null;
  annual_revenue_gbp?: number | null;
  operating_geographies?: string[] | null;
  sustainability_maturity?: SustainabilityMaturity | null;
  budget_constraint_gbp?: number | null;
  target_year?: number | null;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Emission Targets
// ---------------------------------------------------------------------------

export interface Target {
  id: string;
  organisation_id: string;
  target_year: number;
  target_type: TargetType;
  target_value_pct: number;
  baseline_year: number;
  baseline_co2e_tonnes: number;
  target_co2e_tonnes: number | null;
  scope_coverage: number[] | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

export interface TargetCreate {
  target_year: number;
  target_type: TargetType;
  target_value_pct: number;
  baseline_year: number;
  baseline_co2e_tonnes: number;
  scope_coverage?: number[] | null;
  source?: string | null;
  notes?: string | null;
}

export interface TargetUpdate {
  target_year?: number;
  target_type?: TargetType;
  target_value_pct?: number;
  baseline_year?: number;
  baseline_co2e_tonnes?: number;
  scope_coverage?: number[] | null;
  source?: string | null;
  notes?: string | null;
}

export interface TargetListResponse {
  items: Target[];
  total: number;
}

export interface TargetProgress {
  target: Target;
  current_co2e_tonnes: number;
  scenario_reduction_co2e_tonnes: number;
  projected_co2e_tonnes: number;
  gap_co2e_tonnes: number;
  on_track: boolean;
  coverage_pct: number;
  years_remaining: number;
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export interface ScenarioInitiativeItem {
  id: string;
  name: string;
  capex_gbp: number;
  opex_annual_gbp: number | null;
  co2e_reduction_annual_tonnes: number;
  cost_per_tonne: number;
  lifespan_years: number;
  status: string;
  confidence: string | null;
  display_order: number;
  is_included: boolean;
}

export interface TargetAlignmentEntry {
  id: string;
  target_year: number;
  target_type: TargetType;
  target_value_pct: number;
  baseline_co2e_tonnes: number;
  target_co2e_tonnes: number | null;
  projected_co2e_tonnes: number;
  gap_co2e_tonnes: number;
  on_track: boolean;
}

export interface TargetAlignmentInfo {
  has_targets: boolean;
  targets: TargetAlignmentEntry[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string | null;
  is_baseline: boolean;
  total_capex_gbp: number;
  total_opex_annual_gbp: number;
  total_co2e_reduction_annual_tonnes: number;
  residual_co2e_tonnes: number;
  weighted_avg_cost_per_tonne: number;
  initiative_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScenarioDetail extends Scenario {
  initiatives: ScenarioInitiativeItem[];
  target_alignment: TargetAlignmentInfo;
}

export interface ScenarioListResponse {
  items: Scenario[];
  total: number;
}

export interface ScenarioCreate {
  name: string;
  description?: string | null;
  is_baseline?: boolean;
  initiative_ids?: string[];
}

export interface ScenarioUpdate {
  name?: string;
  description?: string | null;
  is_baseline?: boolean;
}

export interface AddInitiativesRequest {
  initiative_ids: string[];
  display_order_start?: number;
}

export interface InitiativeOrderItem {
  initiative_id: string;
  display_order: number;
}

export interface ReorderRequest {
  initiative_order: InitiativeOrderItem[];
}

// ---------------------------------------------------------------------------
// MACC data
// ---------------------------------------------------------------------------

export interface ScenarioMACCBar {
  initiative_id: string;
  initiative_name: string;
  width: number;
  height: number;
  x_start: number;
  cost_per_tonne: number;
  co2e_reduction_annual_tonnes: number;
  capex_gbp: number;
  opex_annual_gbp: number | null;
  status: string;
  confidence: string | null;
  is_negative_cost: boolean;
}

export interface ScenarioMACCSummary {
  total_capex_gbp: number;
  total_opex_annual_gbp: number;
  net_negative_cost_initiatives: number;
  net_positive_cost_initiatives: number;
  weighted_avg_cost_per_tonne: number;
}

export interface ScenarioMACCData {
  scenario_id: string;
  scenario_name: string;
  total_emissions_co2e_tonnes: number;
  total_reduction_co2e_tonnes: number;
  bars: ScenarioMACCBar[];
  summary: ScenarioMACCSummary;
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

export interface ScenarioCompareItem {
  id: string;
  name: string;
  is_baseline: boolean;
  total_capex_gbp: number;
  total_opex_annual_gbp: number;
  total_co2e_reduction_annual_tonnes: number;
  residual_co2e_tonnes: number;
  initiative_count: number;
  avg_cost_per_tonne: number;
  meets_targets: boolean;
  gap_to_target_pct: number;
}

export interface SharedInitiativeItem {
  id: string;
  name: string;
  in_scenarios: string[];
}

export interface UniqueInitiativeItem {
  id: string;
  name: string;
}

export interface CompareResponse {
  scenarios: ScenarioCompareItem[];
  shared_initiatives: SharedInitiativeItem[];
  unique_initiatives: Record<string, UniqueInitiativeItem[]>;
}
