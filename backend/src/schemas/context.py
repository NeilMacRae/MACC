"""Pydantic schemas for context and targets endpoints.

Covers: ContextUpsert, ContextResponse, TargetCreate, TargetUpdate,
TargetResponse, TargetListResponse, TargetProgressResponse
— per context-api.md contract.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Organisational Context
# ---------------------------------------------------------------------------


class ContextUpsert(BaseModel):
    """Body for PUT /context."""

    industry_sector: str | None = Field(None, max_length=100)
    employee_count: int | None = Field(None, gt=0)
    annual_revenue_gbp: float | None = Field(None, gt=0)
    operating_geographies: list[str] | None = Field(None, max_length=50)
    sustainability_maturity: Literal["beginner", "intermediate", "advanced"] | None = None
    budget_constraint_gbp: float | None = Field(None, gt=0)
    target_year: int | None = None
    notes: str | None = None


class ContextResponse(BaseModel):
    """Full context object returned from GET/PUT /context."""

    id: str
    organisation_id: str
    industry_sector: str | None = None
    employee_count: int | None = None
    annual_revenue_gbp: float | None = None
    operating_geographies: list[str] | None = None
    sustainability_maturity: str | None = None
    budget_constraint_gbp: float | None = None
    target_year: int | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Emission Targets
# ---------------------------------------------------------------------------


class TargetCreate(BaseModel):
    """Body for POST /context/targets."""

    target_year: int
    target_type: Literal["absolute", "intensity"]
    target_value_pct: float = Field(..., gt=0, le=100)
    baseline_year: int
    baseline_co2e_tonnes: float = Field(..., gt=0)
    scope_coverage: list[int] | None = None
    source: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=255)


class TargetUpdate(BaseModel):
    """Body for PUT /context/targets/{id} — all fields optional."""

    target_year: int | None = None
    target_type: Literal["absolute", "intensity"] | None = None
    target_value_pct: float | None = Field(None, gt=0, le=100)
    baseline_year: int | None = None
    baseline_co2e_tonnes: float | None = Field(None, gt=0)
    scope_coverage: list[int] | None = None
    source: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=255)


class TargetResponse(BaseModel):
    """Full target object."""

    id: str
    organisation_id: str
    target_year: int
    target_type: str
    target_value_pct: float
    baseline_year: int
    baseline_co2e_tonnes: float
    target_co2e_tonnes: float | None = None
    scope_coverage: list[int] | None = None
    source: str | None = None
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TargetListResponse(BaseModel):
    """Paginated list of targets."""

    items: list[TargetResponse]
    total: int


# ---------------------------------------------------------------------------
# Target Progress
# ---------------------------------------------------------------------------


class TargetProgressResponse(BaseModel):
    """Progress against a target, optionally evaluated for a scenario."""

    target: TargetResponse
    current_co2e_tonnes: float
    scenario_reduction_co2e_tonnes: float
    projected_co2e_tonnes: float
    gap_co2e_tonnes: float
    on_track: bool
    coverage_pct: float
    years_remaining: int
