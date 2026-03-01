# ── AI Suggestions Request/Response Schemas ──────────────────────────────────
from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ── Request Schemas ───────────────────────────────────────────────────────────

class SuggestionRequest(BaseModel):
    """Request for AI-generated abatement initiative suggestions."""
    scope_focus: list[int] = Field(default_factory=lambda: [1, 2, 3], description="Scopes to focus on (1, 2, 3)")
    max_suggestions: int = Field(default=5, ge=1, le=10, description="Maximum number of suggestions to return")
    budget_limit_gbp: Optional[float] = Field(default=None, gt=0, description="Maximum CapEx budget per initiative")
    priority: Literal["cost_effective", "high_impact"] = Field(
        default="cost_effective",
        description="Optimization priority: cost_effective (low £/tCO2e) or high_impact (high total abatement)"
    )
    additional_context: Optional[str] = Field(default=None, max_length=500, description="Additional context for AI")

    @field_validator("scope_focus")
    @classmethod
    def validate_scopes(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("scope_focus must not be empty")
        if not all(s in [1, 2, 3] for s in v):
            raise ValueError("scope_focus must contain only 1, 2, or 3")
        return sorted(set(v))  # Deduplicate and sort


class SuggestionAccept(BaseModel):
    """Optional overrides when accepting an AI suggestion."""
    name: Optional[str] = Field(default=None, max_length=200)
    capex_gbp: Optional[float] = Field(default=None, ge=0)
    co2e_reduction_annual_tonnes: Optional[float] = Field(default=None, gt=0)
    owner: Optional[str] = Field(default=None, max_length=100)
    status: Optional[Literal["idea", "planned", "approved", "in_progress", "completed", "rejected"]] = Field(default="idea")
    add_to_scenario_ids: list[UUID] = Field(default_factory=list, description="Scenarios to add the initiative(s) to")


class SuggestionDismiss(BaseModel):
    """Dismiss an AI suggestion with reason."""
    reason: str = Field(..., min_length=1, max_length=500, description="Reason for dismissing the suggestion")


class ConstraintConfig(BaseModel):
    """AI constraint configuration."""
    excluded_technologies: list[str] = Field(default_factory=list, description="Technologies to exclude (e.g., 'nuclear')")
    excluded_unit_ids: list[UUID] = Field(default_factory=list, description="Company unit IDs to exclude from suggestions")
    excluded_scopes: list[int] = Field(default_factory=list, description="Scopes to exclude (1, 2, 3)")
    max_initiative_cost_gbp: Optional[float] = Field(default=None, gt=0, description="Maximum initiative cost")
    min_confidence_level: Literal["low", "medium", "high"] = Field(default="low", description="Minimum confidence level")
    preferred_payback_years: Optional[int] = Field(default=None, gt=0, description="Preferred payback period in years")
    industry_specific_filters: dict[str, Any] = Field(default_factory=dict, description="Custom industry filters")

    @field_validator("excluded_scopes")
    @classmethod
    def validate_excluded_scopes(cls, v: list[int]) -> list[int]:
        if not all(s in [1, 2, 3] for s in v):
            raise ValueError("excluded_scopes must contain only 1, 2, or 3")
        return sorted(set(v))  # Deduplicate and sort


# ── Response Schemas ──────────────────────────────────────────────────────────

class ActivityBreakdown(BaseModel):
    """Per-activity breakdown for multi-activity programme suggestions."""
    activity: str = Field(..., description="Activity name")
    target_source_ids: list[UUID] = Field(..., description="Emission source IDs targeted by this activity")
    estimated_capex_gbp: float = Field(..., ge=0, description="Estimated CapEx for this activity")
    estimated_opex_annual_gbp: float = Field(..., description="Estimated annual OpEx (positive=cost, negative=saving)")
    estimated_co2e_reduction_annual_tonnes: float = Field(..., gt=0, description="Estimated annual CO2e reduction")


class SuggestionDetail(BaseModel):
    """Single AI-generated suggestion."""
    id: UUID
    name: str = Field(..., max_length=200)
    description: str = Field(..., max_length=1000)
    rationale: str = Field(..., max_length=1000, description="AI's reasoning for this suggestion")
    estimated_capex_gbp: float = Field(..., ge=0)
    estimated_opex_annual_gbp: float = Field(..., description="Positive=cost, negative=saving")
    estimated_co2e_reduction_annual_tonnes: float = Field(..., gt=0)
    estimated_cost_per_tonne: float = Field(..., description="Lifecycle cost per tonne")
    estimated_payback_years: Optional[float] = Field(default=None, description="Payback period if OpEx < 0")
    confidence: Literal["low", "medium", "high"]
    confidence_notes: Optional[str] = Field(default=None, description="Explanation for low confidence")
    target_scopes: list[int] = Field(..., description="Target emission scopes (1, 2, 3)")
    target_source_ids: list[UUID] = Field(..., description="Emission source IDs targeted")
    implementation_complexity: Literal["low", "medium", "high"]
    typical_timeline_months: int = Field(..., gt=0, description="Typical implementation timeline")
    relevance_score: float = Field(..., ge=0.0, le=1.0, description="AI's relevance score (0-1)")
    assumptions: list[str] = Field(default_factory=list, description="Key assumptions made by AI")
    activity_breakdown: Optional[list[ActivityBreakdown]] = Field(
        default=None,
        description="Per-activity breakdown for multi-activity programmes (null for single-activity)"
    )


class ConstraintsRelaxed(BaseModel):
    """Details of constraints that were relaxed to generate suggestions."""
    budget_limit_gbp: Optional[dict[str, float]] = Field(default=None, description="Original and relaxed budget")
    reason: str = Field(..., description="Explanation of why constraints were relaxed")


class ContextUsed(BaseModel):
    """Context information used for generating suggestions."""
    industry_sector: Optional[str] = Field(default=None)
    total_emissions_co2e: float = Field(..., ge=0)
    source_count: int = Field(..., ge=0)
    constraint_config_applied: bool = Field(..., description="Whether user constraints were applied")


class SuggestionResponse(BaseModel):
    """Response from AI suggestion request."""
    request_id: UUID
    model: str = Field(..., description="AI model used (e.g., 'gpt-4o-2024-08-06')")
    suggestions: list[SuggestionDetail]
    constraints_relaxed: Optional[ConstraintsRelaxed] = Field(
        default=None,
        description="Details if constraints were relaxed"
    )
    context_used: ContextUsed
    created_at: datetime


class SuggestionListItem(BaseModel):
    """Summary item for suggestion history list."""
    request_id: UUID
    scope_focus: list[int]
    priority: Literal["cost_effective", "high_impact"]
    suggestion_count: int
    accepted_count: int
    created_at: datetime


class SuggestionListResponse(BaseModel):
    """Paginated list of suggestion requests."""
    items: list[SuggestionListItem]
    total: int
    page: int
    page_size: int


class InitiativeCreated(BaseModel):
    """Initiative created from accepted suggestion (for response)."""
    id: UUID
    name: str
    capex_gbp: float
    opex_annual_gbp: float
    co2e_reduction_annual_tonnes: float
    cost_per_tonne: float
    initiative_type: str  # Will be "ai_suggested"
    source_suggestion_id: UUID


class SuggestionAcceptResponse(BaseModel):
    """Response from accepting a suggestion."""
    initiatives: list[InitiativeCreated] = Field(..., description="Initiative(s) created (one or more for multi-activity)")
    source_suggestion_id: UUID
    added_to_scenarios: list[UUID] = Field(default_factory=list, description="Scenarios the initiative(s) were added to")


class SuggestionDismissResponse(BaseModel):
    """Response from dismissing a suggestion."""
    id: UUID
    status: Literal["dismissed"]
    dismiss_reason: str


class ConstraintConfigResponse(BaseModel):
    """Response for AI constraint configuration."""
    id: UUID
    organisation_id: UUID
    excluded_technologies: list[str]
    excluded_unit_ids: list[UUID]
    excluded_scopes: list[int]
    max_initiative_cost_gbp: Optional[float]
    min_confidence_level: Literal["low", "medium", "high"]
    preferred_payback_years: Optional[int]
    industry_specific_filters: dict[str, Any]
    updated_at: datetime
