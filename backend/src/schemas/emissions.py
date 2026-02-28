"""Pydantic response schemas for the /emissions endpoints.

These mirror the contract defined in contracts/emissions-api.md.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Shared primitives ─────────────────────────────────────────────────────────

class ScopeEntry(BaseModel):
    co2e_tonnes: float
    percentage: float


class ByScopeBreakdown(BaseModel):
    scope_1: ScopeEntry
    scope_2: ScopeEntry
    scope_3: ScopeEntry


class QuestionGroupEntry(BaseModel):
    question_group: str
    co2e_tonnes: float
    percentage: float


class TopSource(BaseModel):
    source_id: str
    activity: str
    question: str
    question_group: str
    scope: int
    co2e_tonnes: float
    percentage: float


# ── Overview ──────────────────────────────────────────────────────────────────

class EmissionsOverviewResponse(BaseModel):
    organisation_id: str
    organisation_name: str
    year: int
    market_factor_type: str
    total_co2e_tonnes: float
    by_scope: ByScopeBreakdown
    by_question_group: list[QuestionGroupEntry]
    top_sources: list[TopSource]
    available_years: list[int]


# ── Hierarchy ─────────────────────────────────────────────────────────────────

class HierarchyNodeResponse(BaseModel):
    id: str
    company_unit_id: int
    company_unit_name: str
    company_unit_type: str
    facility_type: str | None = None
    country: str | None = None
    country_code: str | None = None
    total_co2e_tonnes: float
    children: list[HierarchyNodeResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


# Required for the self-referential model
HierarchyNodeResponse.model_rebuild()


class HierarchyResponse(BaseModel):
    root: HierarchyNodeResponse
    reporting_year: int


# ── Unit Detail ───────────────────────────────────────────────────────────────

class ChildUnitSummary(BaseModel):
    id: str
    company_unit_name: str
    company_unit_type: str
    total_co2e_tonnes: float


class RecordDetail(BaseModel):
    id: str
    year: int
    month: int
    scope: int
    market_factor_type: str
    value: float
    co2e_kg: float
    quality: str | None = None
    upstream: str
    upstream_name: str | None = None


class SourceDetail(BaseModel):
    id: str
    answer_id: int
    activity: str
    question: str
    question_group: str
    answer_unit: str
    co2e_tonnes: float
    scopes: list[int]
    records: list[RecordDetail]


class UnitDetailResponse(BaseModel):
    id: str
    company_unit_id: int
    company_unit_name: str
    company_unit_type: str
    facility_type: str | None = None
    city: str | None = None
    country: str | None = None
    country_code: str | None = None
    market_factor_type: str
    total_co2e_tonnes: float
    by_scope: ByScopeBreakdown
    by_question_group: list[QuestionGroupEntry]
    top_sources: list[TopSource]
    child_units: list[ChildUnitSummary]
    sources: list[SourceDetail]


# ── Trends ────────────────────────────────────────────────────────────────────

class TrendPoint(BaseModel):
    year: int
    co2e_tonnes: float


class TrendsResponse(BaseModel):
    unit_id: str | None
    company_unit_name: str
    market_factor_type: str
    trends: list[TrendPoint]


# ── Sources list (for initiative target selection) ────────────────────────────

class SourceSummary(BaseModel):
    id: str
    answer_id: int
    activity: str
    question: str
    question_group: str
    answer_unit: str
    company_unit_id: str
    company_unit_name: str
    company_unit_type: str
    co2e_tonnes: float
    scopes: list[int]


class SourceListResponse(BaseModel):
    sources: list[SourceSummary]
