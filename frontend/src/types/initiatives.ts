/**
 * TypeScript types for the initiatives API.
 * Mirrors backend/src/schemas/initiatives.py and initiatives-api.md.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type InitiativeStatus =
  | "idea"
  | "planned"
  | "approved"
  | "in_progress"
  | "completed"
  | "rejected";

export type InitiativeType = "custom" | "ai_suggested";

export type ConfidenceLevel = "high" | "medium" | "low";

/** Valid next statuses for each current status (mirrors backend state machine). */
export const STATUS_TRANSITIONS: Record<InitiativeStatus, InitiativeStatus[]> = {
  idea: ["planned", "rejected"],
  planned: ["approved", "rejected"],
  approved: ["in_progress", "rejected"],
  in_progress: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

// ---------------------------------------------------------------------------
// Sub-objects
// ---------------------------------------------------------------------------

export interface EmissionSourceLink {
  id: string;
  activity: string;
  question: string;
  question_group: string;
  answer_unit: string | null;
  co2e_tonnes: number;
  company_unit_name: string | null;
  company_unit_type: string | null;
}

export interface ScenarioRef {
  id: string;
  name: string;
  is_baseline: boolean;
}

export interface InitiativeWarning {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Create / Update payloads
// ---------------------------------------------------------------------------

export interface InitiativeCreate {
  name: string;
  description?: string | null;
  initiative_type?: InitiativeType;
  status?: InitiativeStatus;
  capex_gbp: number;
  opex_annual_gbp?: number | null;
  co2e_reduction_annual_tonnes: number;
  lifespan_years?: number;
  owner?: string | null;
  confidence?: ConfidenceLevel | null;
  notes?: string | null;
  emission_source_ids: string[];
}

export interface InitiativeUpdate {
  name?: string;
  description?: string | null;
  initiative_type?: InitiativeType;
  status?: InitiativeStatus;
  capex_gbp?: number;
  opex_annual_gbp?: number | null;
  co2e_reduction_annual_tonnes?: number;
  lifespan_years?: number | null;
  owner?: string | null;
  confidence?: ConfidenceLevel | null;
  notes?: string | null;
  emission_source_ids?: string[];
}

export interface StatusUpdate {
  status: InitiativeStatus;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

/** Full initiative detail (POST 201, GET detail, PUT, PATCH /status). */
export interface Initiative {
  id: string;
  name: string;
  description: string | null;
  initiative_type: InitiativeType;
  status: InitiativeStatus;
  capex_gbp: number;
  opex_annual_gbp: number | null;
  co2e_reduction_annual_tonnes: number;
  cost_per_tonne: number;
  payback_years: number | null;
  lifespan_years: number;
  owner: string | null;
  confidence: ConfidenceLevel | null;
  notes: string | null;
  source_suggestion_id: string | null;
  emission_sources: EmissionSourceLink[];
  scenarios: ScenarioRef[];
  warnings: InitiativeWarning[];
  created_at: string;
  updated_at: string;
}

/** Summary row in the paginated list. */
export interface InitiativeListItem {
  id: string;
  name: string;
  initiative_type: InitiativeType;
  status: InitiativeStatus;
  capex_gbp: number;
  co2e_reduction_annual_tonnes: number;
  cost_per_tonne: number;
  owner: string | null;
  confidence: ConfidenceLevel | null;
  emission_source_count: number;
  scenario_count: number;
  created_at: string;
}

export interface InitiativeListResponse {
  items: InitiativeListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ---------------------------------------------------------------------------
// Overlap
// ---------------------------------------------------------------------------

export interface SharedSourceInfo {
  id: string;
  activity: string;
  question_group: string;
  co2e_tonnes: number;
}

export interface OverlappingInitiativeInfo {
  id: string;
  name: string;
  shared_sources: SharedSourceInfo[];
  combined_reduction_pct: number;
  warning: string;
}

export interface OverlapResponse {
  initiative_id: string;
  overlapping_initiatives: OverlappingInitiativeInfo[];
  total_overlap_co2e_tonnes: number;
}

// ---------------------------------------------------------------------------
// Bulk validate
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  initiative_id: string;
  issue_type: string;
  message: string;
  source_id?: string | null;
  source_name?: string | null;
}

export interface BulkValidateResponse {
  valid: boolean;
  issues: ValidationIssue[];
}

// ---------------------------------------------------------------------------
// MACC chart data
// ---------------------------------------------------------------------------

export interface MACCBar {
  initiative_id: string;
  name: string;
  status: InitiativeStatus;
  initiative_type: InitiativeType;
  confidence: ConfidenceLevel | null;
  owner: string | null;
  capex_gbp: number;
  co2e_reduction_annual_tonnes: number;
  cost_per_tonne: number;
  opex_annual_gbp: number | null;
  /** Cumulative start x-position (abatement axis). */
  x_start: number;
  /** Cumulative end x-position. */
  x_end: number;
  bar_width: number;
  bar_height: number;
  is_negative_cost: boolean;
}

export interface MACCSummary {
  total_capex_gbp: number;
  total_co2e_reduction_annual_tonnes: number;
  weighted_avg_cost_per_tonne: number;
  bar_count: number;
  negative_cost_count: number;
  positive_cost_count: number;
  max_abatement_potential: number;
}

export interface MACCData {
  bars: MACCBar[];
  summary: MACCSummary;
}

// ---------------------------------------------------------------------------
// Filters / sort
// ---------------------------------------------------------------------------

export interface InitiativeFilters {
  status?: string;            // comma-separated
  initiative_type?: InitiativeType;
  scope?: number;
  sort_by?: "cost_per_tonne" | "co2e_reduction" | "cost" | "name" | "created_at";
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

// ---------------------------------------------------------------------------
// Cascade source-selection types
// ---------------------------------------------------------------------------

export interface CascadeScopeItem {
  scope: number;
  co2e_tonnes: number;
  source_count: number;
}

export interface CascadeScopeResponse {
  items: CascadeScopeItem[];
}

export interface CascadeQuestionGroupItem {
  question_group: string;
  co2e_tonnes: number;
  source_count: number;
}

export interface CascadeQuestionGroupResponse {
  scope: number;
  items: CascadeQuestionGroupItem[];
}

export interface CascadeQuestionItem {
  question: string;
  co2e_tonnes: number;
  source_count: number;
}

export interface CascadeQuestionResponse {
  scope: number;
  question_group: string;
  items: CascadeQuestionItem[];
}

export interface CascadeActivityItem {
  activity: string;
  co2e_tonnes: number;
  source_count: number;
}

export interface CascadeActivityResponse {
  scope: number;
  question_group: string;
  question: string;
  items: CascadeActivityItem[];
}

export interface CascadeCompanyUnitItem {
  emission_source_id: string;
  company_unit_id: string;
  company_unit_name: string;
  company_unit_type: string | null;
  co2e_tonnes: number;
}

export interface CascadeCompanyUnitResponse {
  activity: string;
  items: CascadeCompanyUnitItem[];
}

