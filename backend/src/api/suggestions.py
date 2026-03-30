# ── AI Suggestions API Endpoints ─────────────────────────────────────────────
"""
AI suggestion endpoints for generating and managing abatement initiative suggestions.

Endpoints:
- POST /ai/suggestions - Request new suggestions
- GET /ai/suggestions - List suggestion history
- GET /ai/suggestions/{request_id} - Get suggestion detail
- POST /ai/suggestions/{suggestion_id}/accept - Accept suggestion
- POST /ai/suggestions/{suggestion_id}/dismiss - Dismiss suggestion
- GET /ai/constraints - Get constraint configuration
- PUT /ai/constraints - Update constraint configuration

Per ai-suggestions-api.md contract.
"""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_organisation, get_db
from src.models.organisation import Organisation
from src.models.sync import AIConstraintConfig, AISuggestion, AISuggestionRequest
from src.schemas.suggestions import (
    ConstraintConfig,
    ConstraintConfigResponse,
    InitiativeCreated,
    SuggestionAccept,
    SuggestionAcceptResponse,
    SuggestionDismiss,
    SuggestionDismissResponse,
    SuggestionListItem,
    SuggestionListResponse,
    SuggestionRequest,
    SuggestionResponse,
)
from src.services.suggestion_service import (
    accept_suggestion,
    dismiss_suggestion,
    request_ai_suggestions,
)

router = APIRouter(prefix="/ai", tags=["AI Suggestions"])


# ── Suggestion Request Endpoints ──────────────────────────────────────────────

@router.post(
    "/suggestions",
    response_model=SuggestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Request AI-generated abatement suggestions",
    description="Generate AI suggestions based on emissions profile and context. May take 5-15 seconds.",
)
async def create_suggestion_request(
    request: SuggestionRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    organisation: Annotated[Organisation, Depends(get_current_organisation)],
) -> SuggestionResponse:
    """Request AI-generated abatement suggestions."""
    try:
        return await request_ai_suggestions(
            db=db,
            organisation_id=UUID(organisation.id),
            request=request,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        # OpenAI API errors
        if "openai" in str(type(e)).lower():
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"OpenAI API error: {str(e)}",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error: {str(e)}",
        )


@router.get(
    "/suggestions",
    response_model=SuggestionListResponse,
    summary="List suggestion request history",
    description="Get paginated list of previous AI suggestion requests.",
)
async def list_suggestion_requests(
    db: Annotated[AsyncSession, Depends(get_db)],
    organisation: Annotated[Organisation, Depends(get_current_organisation)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> SuggestionListResponse:
    """List suggestion request history."""
    offset = (page - 1) * page_size

    # Get total count
    count_result = await db.execute(
        select(func.count(AISuggestionRequest.id)).where(
            AISuggestionRequest.organisation_id == organisation.id
        )
    )
    total = count_result.scalar_one()

    # Get requests with suggestion counts
    result = await db.execute(
        select(AISuggestionRequest)
        .where(AISuggestionRequest.organisation_id == organisation.id)
        .order_by(AISuggestionRequest.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    requests = result.scalars().all()

    items = []
    for req in requests:
        # Count suggestions
        suggestion_count_result = await db.execute(
            select(func.count(AISuggestion.id)).where(
                AISuggestion.request_id == req.id
            )
        )
        suggestion_count = suggestion_count_result.scalar_one()

        # Count accepted suggestions
        accepted_count_result = await db.execute(
            select(func.count(AISuggestion.id)).where(
                AISuggestion.request_id == req.id,
                AISuggestion.accepted == True,  # noqa: E712
            )
        )
        accepted_count = accepted_count_result.scalar_one()

        # Parse scope_focus and priority from first suggestion (if available)
        suggestion_result = await db.execute(
            select(AISuggestion)
            .where(AISuggestion.request_id == req.id)
            .limit(1)
        )
        first_suggestion = suggestion_result.scalar_one_or_none()

        scope_focus = [1, 2, 3]  # Default
        priority = "cost_effective"  # Default

        if first_suggestion and first_suggestion.suggestion_data:
            # These aren't stored in the request, so we use placeholder values
            # In a real implementation, we'd store request parameters
            pass

        items.append(
            SuggestionListItem(
                request_id=UUID(req.id),
                scope_focus=scope_focus,
                priority=priority,
                suggestion_count=suggestion_count,
                accepted_count=accepted_count,
                created_at=req.created_at,
            )
        )

    return SuggestionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/suggestions/{request_id}",
    response_model=SuggestionResponse,
    summary="Get suggestion request detail",
    description="Get full details of a specific suggestion request and all its suggestions.",
)
async def get_suggestion_request(
    request_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    organisation: Annotated[Organisation, Depends(get_current_organisation)],
) -> SuggestionResponse:
    """Get suggestion request detail."""
    # Get request
    req = await db.get(AISuggestionRequest, str(request_id))
    if not req or req.organisation_id != organisation.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Suggestion request {request_id} not found",
        )

    # Get suggestions
    result = await db.execute(
        select(AISuggestion).where(AISuggestion.request_id == str(request_id))
    )
    suggestions = result.scalars().all()

    # Build response (reuse cached response builder)
    from src.services.suggestion_service import _build_response_from_cached

    return await _build_response_from_cached(db, req)


# ── Suggestion Action Endpoints ───────────────────────────────────────────────

@router.post(
    "/suggestions/{suggestion_id}/accept",
    response_model=SuggestionAcceptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Accept an AI suggestion",
    description="Convert AI suggestion into initiative(s). Multi-activity suggestions create multiple initiatives.",
)
async def accept_ai_suggestion(
    suggestion_id: UUID,
    accept_data: SuggestionAccept,
    db: Annotated[AsyncSession, Depends(get_db)],
    organisation: Annotated[Organisation, Depends(get_current_organisation)],
) -> SuggestionAcceptResponse:
    """Accept an AI suggestion."""
    try:
        initiatives = await accept_suggestion(
            db=db,
            organisation_id=UUID(organisation.id),
            suggestion_id=suggestion_id,
            accept_data=accept_data,
        )

        return SuggestionAcceptResponse(
            initiatives=[
                InitiativeCreated(
                    id=UUID(init.id),
                    name=init.name,
                    capex_gbp=init.capex_gbp,
                    opex_annual_gbp=init.opex_annual_gbp or 0.0,
                    co2e_reduction_annual_tonnes=init.co2e_reduction_annual_tonnes,
                    cost_per_tonne=init.cost_per_tonne,
                    initiative_type=init.initiative_type,
                    source_suggestion_id=UUID(init.source_suggestion_id),
                )
                for init in initiatives
            ],
            source_suggestion_id=suggestion_id,
            added_to_scenarios=accept_data.add_to_scenario_ids,
        )

    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        elif "already accepted or dismissed" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=error_msg,
            )


@router.post(
    "/suggestions/{suggestion_id}/dismiss",
    response_model=SuggestionDismissResponse,
    status_code=status.HTTP_200_OK,
    summary="Dismiss an AI suggestion",
    description="Mark suggestion as dismissed with reason. Won't appear in similar contexts again.",
)
async def dismiss_ai_suggestion(
    suggestion_id: UUID,
    dismiss_data: SuggestionDismiss,
    db: Annotated[AsyncSession, Depends(get_db)],
    organisation: Annotated[Organisation, Depends(get_current_organisation)],
) -> SuggestionDismissResponse:
    """Dismiss an AI suggestion."""
    try:
        await dismiss_suggestion(
            db=db,
            suggestion_id=suggestion_id,
            dismiss_data=dismiss_data,
        )

        return SuggestionDismissResponse(
            id=suggestion_id,
            status="dismissed",
            dismiss_reason=dismiss_data.reason,
        )

    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        elif "already accepted or dismissed" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=error_msg,
            )


# ── Constraint Configuration Endpoints ────────────────────────────────────────

@router.get(
    "/constraints",
    response_model=ConstraintConfigResponse,
    summary="Get AI constraint configuration",
    description="Retrieve current AI constraint settings. Returns 404 if not configured.",
)
async def get_constraints(
    db: Annotated[AsyncSession, Depends(get_db)],
    organisation: Annotated[Organisation, Depends(get_current_organisation)],
) -> ConstraintConfigResponse:
    """Get AI constraint configuration."""
    result = await db.execute(
        select(AIConstraintConfig).where(
            AIConstraintConfig.organisation_id == organisation.id
        )
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No constraints configured",
        )

    return ConstraintConfigResponse(
        id=UUID(config.id),
        organisation_id=UUID(organisation.id),
        excluded_technologies=config.excluded_technologies or [],
        excluded_unit_ids=[UUID(uid) for uid in (config.excluded_unit_ids or [])],
        excluded_scopes=config.excluded_scopes or [],
        max_initiative_cost_gbp=config.max_initiative_cost_eur,
        min_confidence_level=config.min_confidence_level or "low",
        preferred_payback_years=config.preferred_payback_years,
        industry_specific_filters=config.industry_specific_filters or {},
        updated_at=config.updated_at,
    )


@router.put(
    "/constraints",
    response_model=ConstraintConfigResponse,
    status_code=status.HTTP_200_OK,
    summary="Update AI constraint configuration",
    description="Create or update AI constraint settings (upsert).",
)
async def update_constraints(
    constraints: ConstraintConfig,
    db: Annotated[AsyncSession, Depends(get_db)],
    organisation: Annotated[Organisation, Depends(get_current_organisation)],
) -> ConstraintConfigResponse:
    """Update AI constraint configuration."""
    # Validate excluded_unit_ids exist
    if constraints.excluded_unit_ids:
        from src.models.organisation import CompanyUnit

        for unit_id in constraints.excluded_unit_ids:
            unit = await db.get(CompanyUnit, str(unit_id))
            if not unit or unit.organisation_id != organisation.id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid company unit ID: {unit_id}",
                )

    # Check if config exists
    result = await db.execute(
        select(AIConstraintConfig).where(
            AIConstraintConfig.organisation_id == organisation.id
        )
    )
    config = result.scalar_one_or_none()

    if config:
        # Update existing
        config.excluded_technologies = constraints.excluded_technologies
        config.excluded_unit_ids = [str(uid) for uid in constraints.excluded_unit_ids]
        config.excluded_scopes = constraints.excluded_scopes
        config.max_initiative_cost_eur = constraints.max_initiative_cost_gbp
        config.min_confidence_level = constraints.min_confidence_level
        config.preferred_payback_years = constraints.preferred_payback_years
        config.industry_specific_filters = constraints.industry_specific_filters
    else:
        # Create new
        from src.models.sync import _now, _uuid

        config = AIConstraintConfig(
            id=_uuid(),
            organisation_id=organisation.id,
            excluded_technologies=constraints.excluded_technologies,
            excluded_unit_ids=[str(uid) for uid in constraints.excluded_unit_ids],
            excluded_scopes=constraints.excluded_scopes,
            max_initiative_cost_eur=constraints.max_initiative_cost_gbp,
            min_confidence_level=constraints.min_confidence_level,
            preferred_payback_years=constraints.preferred_payback_years,
            industry_specific_filters=constraints.industry_specific_filters,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)

    return ConstraintConfigResponse(
        id=UUID(config.id),
        organisation_id=UUID(organisation.id),
        excluded_technologies=config.excluded_technologies or [],
        excluded_unit_ids=[UUID(uid) for uid in (config.excluded_unit_ids or [])],
        excluded_scopes=config.excluded_scopes or [],
        max_initiative_cost_gbp=config.max_initiative_cost_eur,
        min_confidence_level=config.min_confidence_level or "low",
        preferred_payback_years=config.preferred_payback_years,
        industry_specific_filters=config.industry_specific_filters or {},
        updated_at=config.updated_at,
    )
