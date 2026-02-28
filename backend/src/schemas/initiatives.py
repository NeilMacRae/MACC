"""Pydantic schemas for initiative endpoints.

Covers: InitiativeCreate, InitiativeUpdate, InitiativeResponse,
InitiativeListResponse, InitiativeListItem, StatusUpdate,
OverlapResponse, BulkValidateResponse, CascadeResponse variants
— per initiatives-api.md and emissions-api.md.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums / literal values (kept as plain strings for Pydantic v2 compatibility)
# ---------------------------------------------------------------------------

VALID_STATUSES = {"idea", "planned", "approved", "in_progress", "completed", "rejected"}
STATUS_TRANSITIONS: dict[str, set[str]] = {
    "idea": {"planned", "rejected"},
    "planned": {"approved", "rejected"},
    "approved": {"in_progress", "rejected"},
    "in_progress": {"completed", "rejected"},
    "completed": set(),
    "rejected": set(),
}
VALID_CONFIDENCE = {"high", "medium", "low"}
VALID_TYPES = {"custom", "ai_suggested"}


# ---------------------------------------------------------------------------
# Linked source sub-objects
# ---------------------------------------------------------------------------


class EmissionSourceLink(BaseModel):
    """Minimal source info returned inside an initiative response."""

    id: str
    activity: str
    question: str
    question_group: str
    answer_unit: str | None = None
    co2e_tonnes: float
    company_unit_name: str | None = None
    company_unit_type: str | None = None


class ScenarioRef(BaseModel):
    """Minimal scenario reference returned inside an initiative response."""

    id: str
    name: str
    is_baseline: bool


# ---------------------------------------------------------------------------
# Warning sub-object
# ---------------------------------------------------------------------------


class InitiativeWarning(BaseModel):
    """Non-blocking warning attached to an initiative response."""

    code: str
    message: str


# ---------------------------------------------------------------------------
# Create / Update
# ---------------------------------------------------------------------------


class InitiativeCreate(BaseModel):
    """Body for POST /initiatives."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    initiative_type: str = Field("custom")
    status: str = Field("idea")
    capex_gbp: float = Field(..., ge=0)
    opex_annual_gbp: float | None = None
    co2e_reduction_annual_tonnes: float = Field(..., gt=0)
    lifespan_years: int = Field(10, ge=1)
    owner: str | None = Field(None, max_length=255)
    confidence: str | None = None
    notes: str | None = None
    emission_source_ids: list[str] = Field(..., min_length=1)

    @field_validator("initiative_type")
    @classmethod
    def _validate_type(cls, v: str) -> str:
        if v not in VALID_TYPES:
            raise ValueError(f"initiative_type must be one of {VALID_TYPES}")
        return v

    @field_validator("status")
    @classmethod
    def _validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"status must be one of {VALID_STATUSES}")
        return v

    @field_validator("confidence")
    @classmethod
    def _validate_confidence(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_CONFIDENCE:
            raise ValueError(f"confidence must be one of {VALID_CONFIDENCE}")
        return v


class InitiativeUpdate(BaseModel):
    """Body for PUT /initiatives/{id}.

    All fields optional — partial updates allowed.
    Status transitions are validated by the service layer.
    """

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    initiative_type: str | None = None
    status: str | None = None
    capex_gbp: float | None = Field(None, ge=0)
    opex_annual_gbp: float | None = None
    co2e_reduction_annual_tonnes: float | None = Field(None, gt=0)
    lifespan_years: int | None = Field(None, ge=1)
    owner: str | None = None
    confidence: str | None = None
    notes: str | None = None
    emission_source_ids: list[str] | None = None

    @field_validator("status")
    @classmethod
    def _validate_status(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f"status must be one of {VALID_STATUSES}")
        return v

    @field_validator("confidence")
    @classmethod
    def _validate_confidence(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_CONFIDENCE:
            raise ValueError(f"confidence must be one of {VALID_CONFIDENCE}")
        return v


class StatusUpdate(BaseModel):
    """Body for PATCH /initiatives/{id}/status."""

    status: str
    notes: str | None = None

    @field_validator("status")
    @classmethod
    def _validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"status must be one of {VALID_STATUSES}")
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class InitiativeResponse(BaseModel):
    """Full initiative detail — returned by POST, GET /{id}, PUT, PATCH /status."""

    id: str
    name: str
    description: str | None
    initiative_type: str
    status: str
    capex_gbp: float
    opex_annual_gbp: float | None
    co2e_reduction_annual_tonnes: float
    cost_per_tonne: float
    payback_years: float | None
    lifespan_years: int
    owner: str | None
    confidence: str | None
    notes: str | None
    source_suggestion_id: str | None
    emission_sources: list[EmissionSourceLink]
    scenarios: list[ScenarioRef]
    warnings: list[InitiativeWarning] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InitiativeListItem(BaseModel):
    """Summary row — returned inside GET / list."""

    id: str
    name: str
    initiative_type: str
    status: str
    capex_gbp: float
    co2e_reduction_annual_tonnes: float
    cost_per_tonne: float
    owner: str | None
    confidence: str | None
    emission_source_count: int
    scenario_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class InitiativeListResponse(BaseModel):
    """Paginated initiative list."""

    items: list[InitiativeListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Overlap detection
# ---------------------------------------------------------------------------


class SharedSourceInfo(BaseModel):
    id: str
    activity: str
    question_group: str
    co2e_tonnes: float


class OverlappingInitiativeInfo(BaseModel):
    id: str
    name: str
    shared_sources: list[SharedSourceInfo]
    combined_reduction_pct: float
    warning: str


class OverlapResponse(BaseModel):
    initiative_id: str
    overlapping_initiatives: list[OverlappingInitiativeInfo]
    total_overlap_co2e_tonnes: float


# ---------------------------------------------------------------------------
# Bulk validate
# ---------------------------------------------------------------------------


class BulkValidateRequest(BaseModel):
    initiative_ids: list[str] = Field(..., min_length=1)


class ValidationIssue(BaseModel):
    initiative_id: str
    issue_type: str
    message: str
    source_id: str | None = None
    source_name: str | None = None


class BulkValidateResponse(BaseModel):
    valid: bool
    issues: list[ValidationIssue]


# ---------------------------------------------------------------------------
# Cascade source-selection schemas (emissions-api.md §Cascade)
# ---------------------------------------------------------------------------


class CascadeScopeItem(BaseModel):
    """One scope entry returned by GET /emissions/cascade/scopes."""

    scope: int
    co2e_tonnes: float
    source_count: int


class CascadeScopeResponse(BaseModel):
    items: list[CascadeScopeItem]


class CascadeQuestionGroupItem(BaseModel):
    question_group: str
    co2e_tonnes: float
    source_count: int


class CascadeQuestionGroupResponse(BaseModel):
    scope: int
    items: list[CascadeQuestionGroupItem]


class CascadeQuestionItem(BaseModel):
    question: str
    co2e_tonnes: float
    source_count: int


class CascadeQuestionResponse(BaseModel):
    scope: int
    question_group: str
    items: list[CascadeQuestionItem]


class CascadeActivityItem(BaseModel):
    activity: str
    co2e_tonnes: float
    source_count: int


class CascadeActivityResponse(BaseModel):
    scope: int
    question_group: str
    question: str
    items: list[CascadeActivityItem]


class CascadeCompanyUnitItem(BaseModel):
    """One company-unit leaf entry — carries an emission_source_id for linking."""

    emission_source_id: str
    company_unit_id: str
    company_unit_name: str
    company_unit_type: str | None
    co2e_tonnes: float


class CascadeCompanyUnitResponse(BaseModel):
    activity: str
    items: list[CascadeCompanyUnitItem]