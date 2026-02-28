"""Pydantic schemas for scenarios endpoints.

Covers: ScenarioCreate, ScenarioUpdate, ScenarioResponse,
ScenarioDetailResponse, ScenarioMACCDataResponse, CompareResponse,
AddInitiativesRequest, ReorderRequest
— per scenarios-api.md contract.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Initiative item inside a scenario detail
# ---------------------------------------------------------------------------


class ScenarioInitiativeItem(BaseModel):
    """A single initiative as it appears inside a scenario detail response."""

    id: str
    name: str
    capex_gbp: float
    opex_annual_gbp: float | None = None
    co2e_reduction_annual_tonnes: float
    cost_per_tonne: float
    lifespan_years: int
    status: str
    confidence: str | None = None
    display_order: int
    is_included: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Target alignment info
# ---------------------------------------------------------------------------


class TargetAlignmentEntry(BaseModel):
    id: str
    target_year: int
    target_type: str
    target_value_pct: float
    baseline_co2e_tonnes: float
    target_co2e_tonnes: float | None = None
    projected_co2e_tonnes: float
    gap_co2e_tonnes: float
    on_track: bool


class TargetAlignmentInfo(BaseModel):
    has_targets: bool
    targets: list[TargetAlignmentEntry] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Scenario Create / Update
# ---------------------------------------------------------------------------


class ScenarioCreate(BaseModel):
    """Body for POST /scenarios."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    is_baseline: bool = False
    initiative_ids: list[str] = Field(default_factory=list)


class ScenarioUpdate(BaseModel):
    """Body for PUT /scenarios/{id} — all fields optional."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_baseline: bool | None = None


# ---------------------------------------------------------------------------
# Scenario responses
# ---------------------------------------------------------------------------


class ScenarioResponse(BaseModel):
    """Summary scenario response (list items and create/update responses)."""

    id: str
    name: str
    description: str | None = None
    is_baseline: bool
    total_capex_gbp: float
    total_opex_annual_gbp: float
    total_co2e_reduction_annual_tonnes: float
    residual_co2e_tonnes: float
    weighted_avg_cost_per_tonne: float
    initiative_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScenarioDetailResponse(ScenarioResponse):
    """Full scenario with initiatives and target alignment."""

    initiatives: list[ScenarioInitiativeItem] = Field(default_factory=list)
    target_alignment: TargetAlignmentInfo


class ScenarioListResponse(BaseModel):
    items: list[ScenarioResponse]
    total: int


# ---------------------------------------------------------------------------
# Add / Reorder initiatives
# ---------------------------------------------------------------------------


class AddInitiativesRequest(BaseModel):
    initiative_ids: list[str] = Field(..., min_length=1)
    display_order_start: int = Field(1, ge=1)


class InitiativeOrderItem(BaseModel):
    initiative_id: str
    display_order: int


class ReorderRequest(BaseModel):
    initiative_order: list[InitiativeOrderItem] = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# MACC data
# ---------------------------------------------------------------------------


class ScenarioMACCBar(BaseModel):
    initiative_id: str
    initiative_name: str
    width: float
    height: float
    x_start: float
    cost_per_tonne: float
    co2e_reduction_annual_tonnes: float
    capex_gbp: float
    opex_annual_gbp: float | None = None
    status: str
    confidence: str | None = None
    is_negative_cost: bool


class ScenarioMACCSummary(BaseModel):
    total_capex_gbp: float
    total_opex_annual_gbp: float
    net_negative_cost_initiatives: int
    net_positive_cost_initiatives: int
    weighted_avg_cost_per_tonne: float


class ScenarioMACCDataResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    total_emissions_co2e_tonnes: float
    total_reduction_co2e_tonnes: float
    bars: list[ScenarioMACCBar]
    summary: ScenarioMACCSummary


# ---------------------------------------------------------------------------
# Compare
# ---------------------------------------------------------------------------


class ScenarioCompareItem(BaseModel):
    id: str
    name: str
    is_baseline: bool
    total_capex_gbp: float
    total_opex_annual_gbp: float
    total_co2e_reduction_annual_tonnes: float
    residual_co2e_tonnes: float
    initiative_count: int
    avg_cost_per_tonne: float
    meets_targets: bool
    gap_to_target_pct: float


class SharedInitiativeItem(BaseModel):
    id: str
    name: str
    in_scenarios: list[str]


class UniqueInitiativeItem(BaseModel):
    id: str
    name: str


class CompareResponse(BaseModel):
    scenarios: list[ScenarioCompareItem]
    shared_initiatives: list[SharedInitiativeItem]
    unique_initiatives: dict[str, list[UniqueInitiativeItem]]
