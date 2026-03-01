// ── AI Suggestions Types ──────────────────────────────────────────────────────

export type Priority = 'cost_effective' | 'high_impact';
export type Confidence = 'low' | 'medium' | 'high';
export type Complexity = 'low' | 'medium' | 'high';

export interface SuggestionRequest {
  scope_focus?: number[];
  max_suggestions?: number;
  budget_limit_gbp?: number;
  priority?: Priority;
  additional_context?: string;
}

export interface ActivityBreakdown {
  activity: string;
  target_source_ids: string[];
  estimated_capex_gbp: number;
  estimated_opex_annual_gbp: number;
  estimated_co2e_reduction_annual_tonnes: number;
}

export interface SuggestionDetail {
  id: string;
  name: string;
  description: string;
  rationale: string;
  estimated_capex_gbp: number;
  estimated_opex_annual_gbp: number;
  estimated_co2e_reduction_annual_tonnes: number;
  estimated_cost_per_tonne: number;
  estimated_payback_years: number | null;
  confidence: Confidence;
  confidence_notes: string | null;
  target_scopes: number[];
  target_source_ids: string[];
  implementation_complexity: Complexity;
  typical_timeline_months: number;
  relevance_score: number;
  assumptions: string[];
  activity_breakdown: ActivityBreakdown[] | null;
}

export interface ConstraintsRelaxed {
  budget_limit_gbp?: {
    original: number;
    relaxed_to: number;
  };
  reason: string;
}

export interface ContextUsed {
  industry_sector: string | null;
  total_emissions_co2e: number;
  source_count: number;
  constraint_config_applied: boolean;
}

export interface SuggestionResponse {
  request_id: string;
  model: string;
  suggestions: SuggestionDetail[];
  constraints_relaxed: ConstraintsRelaxed | null;
  context_used: ContextUsed;
  created_at: string;
}

export interface SuggestionListItem {
  request_id: string;
  scope_focus: number[];
  priority: Priority;
  suggestion_count: number;
  accepted_count: number;
  created_at: string;
}

export interface SuggestionListResponse {
  items: SuggestionListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface SuggestionAccept {
  name?: string;
  capex_gbp?: number;
  co2e_reduction_annual_tonnes?: number;
  owner?: string;
  status?: 'idea' | 'planned' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  add_to_scenario_ids?: string[];
}

export interface InitiativeCreated {
  id: string;
  name: string;
  capex_gbp: number;
  opex_annual_gbp: number;
  co2e_reduction_annual_tonnes: number;
  cost_per_tonne: number;
  initiative_type: string;
  source_suggestion_id: string;
}

export interface SuggestionAcceptResponse {
  initiatives: InitiativeCreated[];
  source_suggestion_id: string;
  added_to_scenarios: string[];
}

export interface SuggestionDismiss {
  reason: string;
}

export interface SuggestionDismissResponse {
  id: string;
  status: 'dismissed';
  dismiss_reason: string;
}

export interface ConstraintConfig {
  excluded_technologies?: string[];
  excluded_unit_ids?: string[];
  excluded_scopes?: number[];
  max_initiative_cost_gbp?: number;
  min_confidence_level?: Confidence;
  preferred_payback_years?: number;
  industry_specific_filters?: Record<string, unknown>;
}

export interface ConstraintConfigResponse {
  id: string;
  organisation_id: string;
  excluded_technologies: string[];
  excluded_unit_ids: string[];
  excluded_scopes: number[];
  max_initiative_cost_gbp: number | null;
  min_confidence_level: Confidence;
  preferred_payback_years: number | null;
  industry_specific_filters: Record<string, unknown>;
  updated_at: string;
}
