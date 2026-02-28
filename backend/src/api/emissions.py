"""Emissions API endpoints — /api/v1/emissions/*

All routes require JWT auth via get_current_organisation dependency.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db, get_current_organisation
from src.models.organisation import Organisation
from src.schemas.emissions import (
    EmissionsOverviewResponse,
    HierarchyResponse,
    UnitDetailResponse,
    TrendsResponse,
    SourceListResponse,
)
from src.schemas.initiatives import (
    CascadeActivityResponse,
    CascadeCompanyUnitResponse,
    CascadeQuestionGroupResponse,
    CascadeQuestionResponse,
    CascadeScopeResponse,
)
from src.services import emissions_service

router = APIRouter(prefix="/emissions", tags=["emissions"])


@router.get("/overview", response_model=EmissionsOverviewResponse)
async def overview(
    year: int | None = Query(None, description="Filter by year (default: latest)"),
    market_factor_type: str = Query("Location", description='"Location" or "Market"'),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> EmissionsOverviewResponse:
    try:
        return await emissions_service.get_overview(
            db, org.id, year, market_factor_type
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/hierarchy", response_model=HierarchyResponse)
async def hierarchy(
    reporting_year: int | None = Query(None),
    market_factor_type: str = Query("Location"),
    parent_id: str | None = Query(None, description="Root node UUID (default: org root)"),
    depth: int | None = Query(None, description="Max tree depth (default: all)"),
    include_closed: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> HierarchyResponse:
    try:
        return await emissions_service.get_hierarchy(
            db, org.id, reporting_year, market_factor_type, parent_id, depth, include_closed
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/units/{unit_id}", response_model=UnitDetailResponse)
async def unit_detail(
    unit_id: str,
    year: int | None = Query(None),
    market_factor_type: str = Query("Location"),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> UnitDetailResponse:
    try:
        return await emissions_service.get_unit_detail(
            db, org.id, unit_id, year, market_factor_type
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/trends", response_model=TrendsResponse)
async def trends(
    unit_id: str | None = Query(None, description="CompanyUnit UUID (default: whole org)"),
    scope: int | None = Query(None, description="Filter to scope 1, 2, or 3"),
    market_factor_type: str = Query("Location"),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> TrendsResponse:
    try:
        return await emissions_service.get_trends(
            db, org.id, unit_id, scope, market_factor_type
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/sources", response_model=SourceListResponse)
async def sources(
    year: int | None = Query(None),
    scope: int | None = Query(None),
    question_group: str | None = Query(None),
    market_factor_type: str = Query("Location"),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> SourceListResponse:
    try:
        return await emissions_service.get_sources(
            db, org.id, year, scope, question_group, market_factor_type
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Cascade source-selection endpoints
# ---------------------------------------------------------------------------


@router.get("/cascade/scopes", response_model=CascadeScopeResponse)
async def cascade_scopes(
    year: int | None = Query(None),
    market_factor_type: str = Query("Location"),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> CascadeScopeResponse:
    """Step 1: return distinct scopes with co2e and source count."""
    items = await emissions_service.get_cascade_scopes(
        db, org.id, year, market_factor_type
    )
    return CascadeScopeResponse(items=items)


@router.get("/cascade/question-groups", response_model=CascadeQuestionGroupResponse)
async def cascade_question_groups(
    scope: int = Query(..., description="Scope (1, 2 or 3)"),
    year: int | None = Query(None),
    market_factor_type: str = Query("Location"),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> CascadeQuestionGroupResponse:
    """Step 2: return question groups for the chosen scope."""
    items = await emissions_service.get_cascade_question_groups(
        db, org.id, scope, year, market_factor_type
    )
    return CascadeQuestionGroupResponse(scope=scope, items=items)


@router.get("/cascade/questions", response_model=CascadeQuestionResponse)
async def cascade_questions(
    scope: int = Query(...),
    question_group: str = Query(...),
    year: int | None = Query(None),
    market_factor_type: str = Query("Location"),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> CascadeQuestionResponse:
    """Step 3: return questions for the chosen scope + question_group."""
    items = await emissions_service.get_cascade_questions(
        db, org.id, scope, question_group, year, market_factor_type
    )
    return CascadeQuestionResponse(scope=scope, question_group=question_group, items=items)


@router.get("/cascade/activities", response_model=CascadeActivityResponse)
async def cascade_activities(
    scope: int = Query(...),
    question_group: str = Query(...),
    question: str = Query(...),
    year: int | None = Query(None),
    market_factor_type: str = Query("Location"),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> CascadeActivityResponse:
    """Step 4: return activities for chosen scope + question_group + question."""
    items = await emissions_service.get_cascade_activities(
        db, org.id, scope, question_group, question, year, market_factor_type
    )
    return CascadeActivityResponse(
        scope=scope, question_group=question_group, question=question, items=items
    )


@router.get("/cascade/company-units", response_model=CascadeCompanyUnitResponse)
async def cascade_company_units(
    activity: str = Query(...),
    scope: int = Query(...),
    question_group: str = Query(...),
    question: str = Query(...),
    year: int | None = Query(None),
    market_factor_type: str = Query("Location"),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> CascadeCompanyUnitResponse:
    """Step 5: return company-unit leaves with emission_source_id for linking."""
    items = await emissions_service.get_cascade_company_units(
        db, org.id, activity, scope, question_group, question, year, market_factor_type
    )
    return CascadeCompanyUnitResponse(activity=activity, items=items)



@router.get("/overview", response_model=EmissionsOverviewResponse)
async def overview(
    year: int | None = Query(None, description="Filter by year (default: latest)"),
    market_factor_type: str = Query("Location", description='"Location" or "Market"'),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> EmissionsOverviewResponse:
    try:
        return await emissions_service.get_overview(
            db, org.id, year, market_factor_type
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/hierarchy", response_model=HierarchyResponse)
async def hierarchy(
    reporting_year: int | None = Query(None),
    market_factor_type: str = Query("Location"),
    parent_id: str | None = Query(None, description="Root node UUID (default: org root)"),
    depth: int | None = Query(None, description="Max tree depth (default: all)"),
    include_closed: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> HierarchyResponse:
    try:
        return await emissions_service.get_hierarchy(
            db, org.id, reporting_year, market_factor_type, parent_id, depth, include_closed
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/units/{unit_id}", response_model=UnitDetailResponse)
async def unit_detail(
    unit_id: str,
    year: int | None = Query(None),
    market_factor_type: str = Query("Location"),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> UnitDetailResponse:
    try:
        return await emissions_service.get_unit_detail(
            db, org.id, unit_id, year, market_factor_type
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/trends", response_model=TrendsResponse)
async def trends(
    unit_id: str | None = Query(None, description="CompanyUnit UUID (default: whole org)"),
    scope: int | None = Query(None, description="Filter to scope 1, 2, or 3"),
    market_factor_type: str = Query("Location"),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> TrendsResponse:
    try:
        return await emissions_service.get_trends(
            db, org.id, unit_id, scope, market_factor_type
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/sources", response_model=SourceListResponse)
async def sources(
    year: int | None = Query(None),
    scope: int | None = Query(None),
    question_group: str | None = Query(None),
    market_factor_type: str = Query("Location"),
    db: AsyncSession = Depends(get_db),
    org: Organisation = Depends(get_current_organisation),
) -> SourceListResponse:
    try:
        return await emissions_service.get_sources(
            db, org.id, year, scope, question_group, market_factor_type
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
