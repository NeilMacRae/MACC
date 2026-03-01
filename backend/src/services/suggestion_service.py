# ── AI Suggestion Service ─────────────────────────────────────────────────────
"""
Service for AI-generated abatement initiative suggestions.

Key responsibilities:
- Construct prompts with emissions profile + organisational context + constraints
- Call Anthropic Claude API with structured outputs
- Parse and validate responses
- Handle multi-activity breakdown logic
- Accept/dismiss flow with initiative creation
- Low-confidence fallback when constraints can't be met

Per research.md R3 and R3b.
"""
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.integrations.openai_client import compute_content_hash, request_structured_completion
from src.models.context import OrganisationalContext
from src.models.emissions import EmissionRecord, EmissionSource
from src.models.organisation import CompanyUnit
from src.models.initiative import AbatementInitiative, InitiativeEmissionSource
from src.models.scenario import Scenario, ScenarioInitiative
from src.models.sync import AIConstraintConfig, AISuggestion, AISuggestionRequest
from src.schemas.suggestions import (
    ActivityBreakdown,
    ConstraintsRelaxed,
    ContextUsed,
    SuggestionAccept,
    SuggestionDetail,
    SuggestionDismiss,
    SuggestionRequest,
    SuggestionResponse,
)


# ── Structured Output Schema for Anthropic ────────────────────────────────────

class AIActivityBreakdown(BaseModel):
    """Per-activity breakdown in AI response."""
    activity: str
    target_source_ids: list[str]
    estimated_capex_gbp: float
    estimated_opex_annual_gbp: float
    estimated_co2e_reduction_annual_tonnes: float


class AISuggestionOutput(BaseModel):
    """Single suggestion in AI structured output."""
    name: str
    description: str
    rationale: str
    estimated_capex_gbp: float
    estimated_opex_annual_gbp: float
    estimated_co2e_reduction_annual_tonnes: float
    estimated_cost_per_tonne: float
    estimated_payback_years: Optional[float]
    confidence: str  # "low" | "medium" | "high"
    confidence_notes: Optional[str]
    target_scopes: list[int]
    target_source_ids: list[str]
    implementation_complexity: str  # "low" | "medium" | "high"
    typical_timeline_months: int
    relevance_score: float
    assumptions: list[str]
    activity_breakdown: Optional[list[AIActivityBreakdown]]


class AIConstraintsRelaxed(BaseModel):
    """Constraints that were relaxed."""
    budget_limit_gbp: Optional[dict[str, float]]
    reason: str


class OpenAISuggestionResponse(BaseModel):
    """Top-level structured output from OpenAI."""
    reasoning: str  # Chain-of-thought analysis (required to force reasoning)
    suggestions: list[AISuggestionOutput]
    constraints_relaxed: Optional[AIConstraintsRelaxed]


# ── Service Functions ──────────────────────────────────────────────────────────

async def request_ai_suggestions(
    db: AsyncSession,
    organisation_id: UUID,
    request: SuggestionRequest,
) -> SuggestionResponse:
    """
    Request AI-generated abatement suggestions.

    Steps:
    1. Load emissions profile, organisational context, constraints
    2. Construct prompt with XML-delimited sections
    3. Call OpenAI with structured outputs
    4. Validate business rules (sources exist, estimates plausible)
    5. Persist request and suggestions
    6. Return response

    Raises:
        ValueError: If prerequisites not met or validation fails
        openai.APIError: On OpenAI API errors
    """
    # Load context
    org_context = await _load_organisational_context(db, organisation_id)
    constraints = await _load_constraints(db, organisation_id)
    emissions_profile = await _load_emissions_profile(db, organisation_id, request.scope_focus)

    if not emissions_profile:
        raise ValueError("No emission sources found. Cannot generate suggestions.")

    # Construct prompt
    developer_instructions = _build_developer_instructions()
    user_message = _build_user_message(
        emissions_profile=emissions_profile,
        org_context=org_context,
        constraints=constraints,
        request=request,
    )

    # Compute input hash for caching
    input_hash = compute_content_hash(user_message)

    # Check for recent cached request
    cached_request = await _check_cached_request(db, organisation_id, input_hash)
    if cached_request:
        return await _build_response_from_cached(db, cached_request)

    # Call OpenAI API
    request_id = str(uuid4())
    start_time = datetime.utcnow()

    try:
        ai_response, was_cached = await request_structured_completion(
            developer_instructions=developer_instructions,
            user_message=user_message,
            response_model=OpenAISuggestionResponse,
        )
        
        end_time = datetime.utcnow()
        latency_ms = int((end_time - start_time).total_seconds() * 1000)

        # Validate business rules
        await _validate_suggestions(db, organisation_id, ai_response.suggestions)

        # Persist request and suggestions
        await _persist_request_and_suggestions(
            db=db,
            request_id=request_id,
            organisation_id=organisation_id,
            input_hash=input_hash,
            ai_response=ai_response,
            latency_ms=latency_ms,
        )

        # Build response
        return _build_suggestion_response(
            request_id=UUID(request_id),
            ai_response=ai_response,
            org_context=org_context,
            emissions_profile=emissions_profile,
            constraint_config_applied=constraints is not None,
        )

    except Exception as e:
        # Persist failed request
        await _persist_failed_request(
            db=db,
            request_id=request_id,
            organisation_id=organisation_id,
            input_hash=input_hash,
            error_message=str(e),
        )
        raise


async def accept_suggestion(
    db: AsyncSession,
    organisation_id: UUID,
    suggestion_id: UUID,
    accept_data: SuggestionAccept,
) -> list[AbatementInitiative]:
    """
    Accept an AI suggestion and convert to initiative(s).

    For single-activity suggestions: creates one initiative.
    For multi-activity suggestions: creates one initiative per activity breakdown.

    Returns:
        List of created AbatementInitiative objects
    """
    # Load suggestion
    suggestion = await db.get(AISuggestion, str(suggestion_id))
    if not suggestion:
        raise ValueError(f"Suggestion {suggestion_id} not found")

    if suggestion.accepted is not None:
        raise ValueError(f"Suggestion {suggestion_id} already accepted or dismissed")

    suggestion_data = suggestion.suggestion_data
    activity_breakdown = suggestion_data.get("activity_breakdown")

    initiatives = []

    if activity_breakdown:
        # Multi-activity: create one initiative per activity
        for idx, breakdown in enumerate(activity_breakdown):
            initiative = await _create_initiative_from_breakdown(
                db=db,
                organisation_id=organisation_id,
                suggestion_id=suggestion_id,
                suggestion_data=suggestion_data,
                breakdown=breakdown,
                overrides=accept_data if idx == 0 else None,  # Only apply overrides to first
            )
            initiatives.append(initiative)
    else:
        # Single-activity: create one initiative
        initiative = await _create_initiative_from_suggestion(
            db=db,
            organisation_id=organisation_id,
            suggestion_id=suggestion_id,
            suggestion_data=suggestion_data,
            overrides=accept_data,
        )
        initiatives.append(initiative)

    # Mark suggestion as accepted
    suggestion.accepted = True
    await db.commit()

    # Add to scenarios if requested
    if accept_data.add_to_scenario_ids:
        await _add_initiatives_to_scenarios(db, initiatives, accept_data.add_to_scenario_ids)

    return initiatives


async def dismiss_suggestion(
    db: AsyncSession,
    suggestion_id: UUID,
    dismiss_data: SuggestionDismiss,
) -> None:
    """
    Dismiss an AI suggestion.

    The suggestion won't be returned in similar contexts again.
    """
    suggestion = await db.get(AISuggestion, str(suggestion_id))
    if not suggestion:
        raise ValueError(f"Suggestion {suggestion_id} not found")

    if suggestion.accepted is not None:
        raise ValueError(f"Suggestion {suggestion_id} already accepted or dismissed")

    # Mark as dismissed
    suggestion.accepted = False
    suggestion.suggestion_data["dismiss_reason"] = dismiss_data.reason
    await db.commit()


# ── Helper Functions ───────────────────────────────────────────────────────────

async def _load_organisational_context(
    db: AsyncSession,
    organisation_id: UUID,
) -> Optional[OrganisationalContext]:
    """Load organisational context."""
    result = await db.execute(
        select(OrganisationalContext).where(
            OrganisationalContext.organisation_id == str(organisation_id)
        )
    )
    return result.scalar_one_or_none()


async def _load_constraints(
    db: AsyncSession,
    organisation_id: UUID,
) -> Optional[AIConstraintConfig]:
    """Load AI constraint configuration."""
    result = await db.execute(
        select(AIConstraintConfig).where(
            AIConstraintConfig.organisation_id == str(organisation_id)
        )
    )
    return result.scalar_one_or_none()


async def _load_emissions_profile(
    db: AsyncSession,
    organisation_id: UUID,
    scope_focus: list[int],
) -> list[dict]:
    """Load emissions profile data for prompt."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Loading emissions profile for org_id={organisation_id}, scope_focus={scope_focus}")
    
    # Join EmissionSource -> CompanyUnit -> Organisation, and include EmissionRecord for scope filtering
    query = (
        select(EmissionSource, EmissionRecord.scope)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .join(EmissionRecord, EmissionSource.id == EmissionRecord.emission_source_id)
        .where(CompanyUnit.organisation_id == str(organisation_id))
    )
    
    if scope_focus:
        query = query.where(EmissionRecord.scope.in_(scope_focus))
    
    query = query.distinct().limit(100)  # Cap to avoid huge prompts
    
    result = await db.execute(query)
    rows = result.all()
    logger.info(f"Query returned {len(rows)} rows")
    print(f"DEBUG: _load_emissions_profile - org_id={organisation_id}, scope_focus={scope_focus}, rows={len(rows)}")

    # Group by source to get unique sources with their scopes
    sources_dict = {}
    for source, scope in rows:
        if source.id not in sources_dict:
            sources_dict[source.id] = {
                "id": source.id,
                "activity": source.activity,
                "question": source.question,
                "question_group": source.question_group,
                "scopes": set()
            }
        sources_dict[source.id]["scopes"].add(scope)
    
    print(f"DEBUG: sources_dict has {len(sources_dict)} unique sources")
    
    # Convert to list format with scopes as lists
    result_list = [
        {
            "id": data["id"],
            "activity": data["activity"],
            "question": data["question"],
            "question_group": data["question_group"],
            "scopes": sorted(list(data["scopes"]))
        }
        for data in sources_dict.values()
    ]
    
    print(f"DEBUG: returning {len(result_list)} sources")
    return result_list


def _build_developer_instructions() -> str:
    """Build developer role instructions for AI."""
    return """You are an expert sustainability consultant specializing in emissions reduction.

Your task is to generate practical, relevant abatement initiative suggestions based on the user's emissions profile and organisational context.

Requirements:
- Suggestions must target existing emission sources from the provided profile
- Cost estimates must be realistic for the given industry and scale
- Consider the organisation's maturity level and constraints
- Provide clear rationale and assumptions for each suggestion
- If constraints can't be fully met, relax them minimally and flag low confidence
- For programme-level initiatives spanning multiple activities, provide per-activity breakdown

Focus on proven, implementable technologies appropriate for the organisation's sector."""


def _build_user_message(
    emissions_profile: list[dict],
    org_context: Optional[OrganisationalContext],
    constraints: Optional[AIConstraintConfig],
    request: SuggestionRequest,
) -> str:
    """Build user message with XML-delimited sections."""
    # Emissions profile section
    emissions_xml = "<emissions_profile>\n"
    emissions_xml += f"Total sources: {len(emissions_profile)}\n"
    emissions_xml += "Sources:\n"
    for source in emissions_profile[:20]:  # Limit to avoid huge prompts
        scopes_str = ','.join(map(str, source['scopes']))
        emissions_xml += f"  - {source['question_group']} / {source['question']} / {source['activity']} (Scope {scopes_str}, ID: {source['id']})\n"
    emissions_xml += "</emissions_profile>\n\n"

    # Organisational context section
    context_xml = "<organisational_context>\n"
    if org_context:
        context_xml += f"Industry: {org_context.industry_sector or 'Not specified'}\n"
        context_xml += f"Maturity: {org_context.sustainability_maturity or 'Not specified'}\n"
        if org_context.employee_count:
            context_xml += f"Employees: {org_context.employee_count}\n"
        if org_context.operating_geographies:
            context_xml += f"Operating in: {', '.join(org_context.operating_geographies[:5])}\n"
    else:
        context_xml += "No context provided\n"
    context_xml += "</organisational_context>\n\n"

    # Constraints section
    constraints_xml = "<constraints>\n"
    if constraints:
        if constraints.excluded_technologies:
            constraints_xml += f"Excluded technologies: {', '.join(constraints.excluded_technologies)}\n"
        if constraints.max_initiative_cost_eur:
            constraints_xml += f"Max cost: £{constraints.max_initiative_cost_eur:,.0f}\n"
        if constraints.excluded_scopes:
            constraints_xml += f"Excluded scopes: {', '.join(map(str, constraints.excluded_scopes))}\n"
        if constraints.preferred_payback_years:
            constraints_xml += f"Preferred payback: ≤{constraints.preferred_payback_years} years\n"
    else:
        constraints_xml += "No constraints configured\n"
    constraints_xml += "</constraints>\n\n"

    # Request parameters
    params_xml = "<request_parameters>\n"
    params_xml += f"Priority: {request.priority}\n"
    params_xml += f"Max suggestions: {request.max_suggestions}\n"
    params_xml += f"Scope focus: {', '.join(map(str, request.scope_focus))}\n"
    if request.budget_limit_gbp:
        params_xml += f"Budget limit: £{request.budget_limit_gbp:,.0f}\n"
    if request.additional_context:
        params_xml += f"Additional context: {request.additional_context}\n"
    params_xml += "</request_parameters>"

    return emissions_xml + context_xml + constraints_xml + params_xml


async def _validate_suggestions(
    db: AsyncSession,
    organisation_id: UUID,
    suggestions: list[AISuggestionOutput],
) -> None:
    """Validate that suggested source IDs exist and belong to the organisation."""
    for suggestion in suggestions:
        for source_id in suggestion.target_source_ids:
            # Query with join to check organisation ownership
            result = await db.execute(
                select(EmissionSource)
                .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
                .where(
                    EmissionSource.id == source_id,
                    CompanyUnit.organisation_id == str(organisation_id)
                )
            )
            source = result.scalar_one_or_none()
            if not source:
                raise ValueError(f"Invalid emission source ID in suggestion: {source_id}")


async def _check_cached_request(
    db: AsyncSession,
    organisation_id: UUID,
    input_hash: str,
) -> Optional[AISuggestionRequest]:
    """Check for recent cached request with same input hash."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    result = await db.execute(
        select(AISuggestionRequest)
        .where(
            AISuggestionRequest.organisation_id == str(organisation_id),
            AISuggestionRequest.input_hash == input_hash,
            AISuggestionRequest.created_at >= cutoff,
            AISuggestionRequest.status == "success",
        )
        .order_by(AISuggestionRequest.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _build_response_from_cached(
    db: AsyncSession,
    cached_request: AISuggestionRequest,
) -> SuggestionResponse:
    """Build response from cached request."""
    # Load suggestions
    result = await db.execute(
        select(AISuggestion).where(AISuggestion.request_id == cached_request.id)
    )
    suggestions = result.scalars().all()

    suggestion_details = []
    for suggestion in suggestions:
        data = suggestion.suggestion_data
        activity_breakdown = None
        if data.get("activity_breakdown"):
            activity_breakdown = [
                ActivityBreakdown(**breakdown) for breakdown in data["activity_breakdown"]
            ]

        suggestion_details.append(
            SuggestionDetail(
                id=UUID(suggestion.id),
                name=data["name"],
                description=data["description"],
                rationale=data["rationale"],
                estimated_capex_gbp=data["estimated_capex_gbp"],
                estimated_opex_annual_gbp=data["estimated_opex_annual_gbp"],
                estimated_co2e_reduction_annual_tonnes=data["estimated_co2e_reduction_annual_tonnes"],
                estimated_cost_per_tonne=data["estimated_cost_per_tonne"],
                estimated_payback_years=data.get("estimated_payback_years"),
                confidence=data["confidence"],
                confidence_notes=data.get("confidence_notes"),
                target_scopes=data["target_scopes"],
                target_source_ids=[UUID(sid) for sid in data["target_source_ids"]],
                implementation_complexity=data["implementation_complexity"],
                typical_timeline_months=data["typical_timeline_months"],
                relevance_score=data["relevance_score"],
                assumptions=data["assumptions"],
                activity_breakdown=activity_breakdown,
            )
        )

    return SuggestionResponse(
        request_id=UUID(cached_request.id),
        model=cached_request.model_used,
        suggestions=suggestion_details,
        constraints_relaxed=None,  # Not stored in cache
        context_used=ContextUsed(
            industry_sector=None,
            total_emissions_co2e=0.0,
            source_count=len(suggestions),
            constraint_config_applied=True,
        ),
        created_at=cached_request.created_at,
    )


async def _persist_request_and_suggestions(
    db: AsyncSession,
    request_id: str,
    organisation_id: UUID,
    input_hash: str,
    ai_response: OpenAISuggestionResponse,
    latency_ms: int,
) -> None:
    """Persist AI request and suggestions to database."""
    # Create request record
    db_request = AISuggestionRequest(
        id=request_id,
        organisation_id=str(organisation_id),
        input_hash=input_hash,
        model_used="gpt-4o-2024-08-06",
        latency_ms=latency_ms,
        status="success",
    )
    db.add(db_request)

    # Create suggestion records
    for suggestion_output in ai_response.suggestions:
        suggestion_data = {
            "name": suggestion_output.name,
            "description": suggestion_output.description,
            "rationale": suggestion_output.rationale,
            "estimated_capex_gbp": suggestion_output.estimated_capex_gbp,
            "estimated_opex_annual_gbp": suggestion_output.estimated_opex_annual_gbp,
            "estimated_co2e_reduction_annual_tonnes": suggestion_output.estimated_co2e_reduction_annual_tonnes,
            "estimated_cost_per_tonne": suggestion_output.estimated_cost_per_tonne,
            "estimated_payback_years": suggestion_output.estimated_payback_years,
            "confidence": suggestion_output.confidence,
            "confidence_notes": suggestion_output.confidence_notes,
            "target_scopes": suggestion_output.target_scopes,
            "target_source_ids": suggestion_output.target_source_ids,
            "implementation_complexity": suggestion_output.implementation_complexity,
            "typical_timeline_months": suggestion_output.typical_timeline_months,
            "relevance_score": suggestion_output.relevance_score,
            "assumptions": suggestion_output.assumptions,
            "activity_breakdown": [
                {
                    "activity": ab.activity,
                    "target_source_ids": ab.target_source_ids,
                    "estimated_capex_gbp": ab.estimated_capex_gbp,
                    "estimated_opex_annual_gbp": ab.estimated_opex_annual_gbp,
                    "estimated_co2e_reduction_annual_tonnes": ab.estimated_co2e_reduction_annual_tonnes,
                }
                for ab in (suggestion_output.activity_breakdown or [])
            ] if suggestion_output.activity_breakdown else None,
        }

        db_suggestion = AISuggestion(
            id=str(uuid4()),
            request_id=request_id,
            suggestion_data=suggestion_data,
        )
        db.add(db_suggestion)

    await db.commit()


async def _persist_failed_request(
    db: AsyncSession,
    request_id: str,
    organisation_id: UUID,
    input_hash: str,
    error_message: str,
) -> None:
    """Persist failed request to database."""
    db_request = AISuggestionRequest(
        id=request_id,
        organisation_id=str(organisation_id),
        input_hash=input_hash,
        model_used="gpt-4o-2024-08-06",
        status="error",
        error_message=error_message,
    )
    db.add(db_request)
    await db.commit()


def _build_suggestion_response(
    request_id: UUID,
    ai_response: OpenAISuggestionResponse,
    org_context: Optional[OrganisationalContext],
    emissions_profile: list[dict],
    constraint_config_applied: bool,
) -> SuggestionResponse:
    """Build final SuggestionResponse from AI output."""
    suggestions = []
    for suggestion_output in ai_response.suggestions:
        activity_breakdown = None
        if suggestion_output.activity_breakdown:
            activity_breakdown = [
                ActivityBreakdown(
                    activity=ab.activity,
                    target_source_ids=[UUID(sid) for sid in ab.target_source_ids],
                    estimated_capex_gbp=ab.estimated_capex_gbp,
                    estimated_opex_annual_gbp=ab.estimated_opex_annual_gbp,
                    estimated_co2e_reduction_annual_tonnes=ab.estimated_co2e_reduction_annual_tonnes,
                )
                for ab in suggestion_output.activity_breakdown
            ]

        suggestions.append(
            SuggestionDetail(
                id=uuid4(),  # Temporary ID, will be replaced when persisted
                name=suggestion_output.name,
                description=suggestion_output.description,
                rationale=suggestion_output.rationale,
                estimated_capex_gbp=suggestion_output.estimated_capex_gbp,
                estimated_opex_annual_gbp=suggestion_output.estimated_opex_annual_gbp,
                estimated_co2e_reduction_annual_tonnes=suggestion_output.estimated_co2e_reduction_annual_tonnes,
                estimated_cost_per_tonne=suggestion_output.estimated_cost_per_tonne,
                estimated_payback_years=suggestion_output.estimated_payback_years,
                confidence=suggestion_output.confidence,
                confidence_notes=suggestion_output.confidence_notes,
                target_scopes=suggestion_output.target_scopes,
                target_source_ids=[UUID(sid) for sid in suggestion_output.target_source_ids],
                implementation_complexity=suggestion_output.implementation_complexity,
                typical_timeline_months=suggestion_output.typical_timeline_months,
                relevance_score=suggestion_output.relevance_score,
                assumptions=suggestion_output.assumptions,
                activity_breakdown=activity_breakdown,
            )
        )

    constraints_relaxed = None
    if ai_response.constraints_relaxed:
        constraints_relaxed = ConstraintsRelaxed(
            budget_limit_gbp=ai_response.constraints_relaxed.budget_limit_gbp,
            reason=ai_response.constraints_relaxed.reason,
        )

    return SuggestionResponse(
        request_id=request_id,
        model="gpt-4o-2024-08-06",
        suggestions=suggestions,
        constraints_relaxed=constraints_relaxed,
        context_used=ContextUsed(
            industry_sector=org_context.industry_sector if org_context else None,
            total_emissions_co2e=0.0,  # TODO: Calculate from profile
            source_count=len(emissions_profile),
            constraint_config_applied=constraint_config_applied,
        ),
        created_at=datetime.utcnow(),
    )


async def _create_initiative_from_suggestion(
    db: AsyncSession,
    organisation_id: UUID,
    suggestion_id: UUID,
    suggestion_data: dict,
    overrides: Optional[SuggestionAccept],
) -> AbatementInitiative:
    """Create initiative from single-activity suggestion."""
    name = overrides.name if overrides and overrides.name else suggestion_data["name"]
    capex_gbp = overrides.capex_gbp if overrides and overrides.capex_gbp is not None else suggestion_data["estimated_capex_gbp"]
    co2e_reduction = overrides.co2e_reduction_annual_tonnes if overrides and overrides.co2e_reduction_annual_tonnes else suggestion_data["estimated_co2e_reduction_annual_tonnes"]
    opex_annual_gbp = suggestion_data["estimated_opex_annual_gbp"]
    lifespan_years = 10  # Default

    # Calculate cost_per_tonne and payback
    cost_per_tonne = (capex_gbp + opex_annual_gbp * lifespan_years) / co2e_reduction
    payback_years = None
    if opex_annual_gbp < 0:
        payback_years = capex_gbp / abs(opex_annual_gbp)

    initiative = AbatementInitiative(
        id=str(uuid4()),
        organisation_id=str(organisation_id),
        name=name,
        description=suggestion_data["description"],
        initiative_type="ai_suggested",
        status=overrides.status if overrides else "idea",
        capex_gbp=capex_gbp,
        opex_annual_gbp=opex_annual_gbp,
        co2e_reduction_annual_tonnes=co2e_reduction,
        cost_per_tonne=cost_per_tonne,
        payback_years=payback_years,
        lifespan_years=lifespan_years,
        owner=overrides.owner if overrides else None,
        confidence=suggestion_data.get("confidence"),
        ai_rationale=suggestion_data.get("rationale"),
        source_suggestion_id=str(suggestion_id),
    )
    db.add(initiative)

    # Link to emission sources
    for source_id in suggestion_data["target_source_ids"]:
        link = InitiativeEmissionSource(
            initiative_id=initiative.id,
            emission_source_id=source_id,
        )
        db.add(link)

    await db.commit()
    await db.refresh(initiative)
    return initiative


async def _create_initiative_from_breakdown(
    db: AsyncSession,
    organisation_id: UUID,
    suggestion_id: UUID,
    suggestion_data: dict,
    breakdown: dict,
    overrides: Optional[SuggestionAccept],
) -> AbatementInitiative:
    """Create initiative from activity breakdown."""
    name = f"{suggestion_data['name']} - {breakdown['activity']}"
    capex_gbp = breakdown["estimated_capex_gbp"]
    opex_annual_gbp = breakdown["estimated_opex_annual_gbp"]
    co2e_reduction = breakdown["estimated_co2e_reduction_annual_tonnes"]
    lifespan_years = 10

    # Calculate metrics
    cost_per_tonne = (capex_gbp + opex_annual_gbp * lifespan_years) / co2e_reduction
    payback_years = None
    if opex_annual_gbp < 0:
        payback_years = capex_gbp / abs(opex_annual_gbp)

    initiative = AbatementInitiative(
        id=str(uuid4()),
        organisation_id=str(organisation_id),
        name=name,
        description=f"{suggestion_data['description']} (Activity: {breakdown['activity']})",
        initiative_type="ai_suggested",
        status=overrides.status if overrides else "idea",
        capex_gbp=capex_gbp,
        opex_annual_gbp=opex_annual_gbp,
        co2e_reduction_annual_tonnes=co2e_reduction,
        cost_per_tonne=cost_per_tonne,
        payback_years=payback_years,
        lifespan_years=lifespan_years,
        owner=overrides.owner if overrides else None,
        confidence=suggestion_data.get("confidence"),
        ai_rationale=suggestion_data.get("rationale"),
        source_suggestion_id=str(suggestion_id),
    )
    db.add(initiative)

    # Link to emission sources
    for source_id in breakdown["target_source_ids"]:
        link = InitiativeEmissionSource(
            initiative_id=initiative.id,
            emission_source_id=source_id,
        )
        db.add(link)

    await db.commit()
    await db.refresh(initiative)
    return initiative


async def _add_initiatives_to_scenarios(
    db: AsyncSession,
    initiatives: list[AbatementInitiative],
    scenario_ids: list[UUID],
) -> None:
    """Add initiatives to specified scenarios."""
    for scenario_id in scenario_ids:
        scenario = await db.get(Scenario, str(scenario_id))
        if not scenario:
            continue  # Skip invalid scenario IDs

        # Get max display_order
        result = await db.execute(
            select(ScenarioInitiative.display_order)
            .where(ScenarioInitiative.scenario_id == str(scenario_id))
            .order_by(ScenarioInitiative.display_order.desc())
            .limit(1)
        )
        max_order = result.scalar_one_or_none() or 0

        # Add initiatives
        for idx, initiative in enumerate(initiatives):
            link = ScenarioInitiative(
                scenario_id=str(scenario_id),
                initiative_id=initiative.id,
                is_included=True,
                display_order=max_order + idx + 1,
            )
            db.add(link)

    await db.commit()
