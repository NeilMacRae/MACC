// ─── Shared TypeScript types ─────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface ApiError {
  detail: string;
  status: number;
  code?: string;
}

export type Scope = 'scope_1' | 'scope_2' | 'scope_3';

export interface ScopeBreakdown {
  scope_1: number;
  scope_2: number;
  scope_3: number;
  total: number;
}

export type MarketFactorType = 'location' | 'market';

export type InitiativeStatus =
  | 'idea'
  | 'planned'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'rejected';

export type InitiativeType =
  | 'operational'
  | 'technology'
  | 'procurement'
  | 'behaviour'
  | 'offset';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface DateRange {
  from: string; // ISO date
  to: string;   // ISO date
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
}

// Utility
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
