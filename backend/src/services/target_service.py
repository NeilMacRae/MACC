"""Target service — CRUD for EmissionTarget and progress calculation.

Progress calculation:
  current_co2e_tonnes    = latest-year total emissions for the org (scoped by coverage)
  scenario_reduction     = sum of co2e_reduction_annual_tonnes for included initiatives in scenario
  projected_co2e_tonnes  = current - scenario_reduction (clamped to 0)
  gap_co2e_tonnes        = max(0, projected - target_co2e_tonnes)
  on_track               = gap_co2e_tonnes == 0
  coverage_pct           = scenario_reduction / current_co2e_tonnes * 100 (clamped 0-100)
  years_remaining        = target_year - current_year
"""

from __future__ import annotations

import datetime

from fastapi import HTTPException, status as http_status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.context import EmissionTarget
from src.models.emissions import EmissionRecord, EmissionSource
from src.models.initiative import AbatementInitiative
from src.models.organisation import CompanyUnit
from src.models.scenario import Scenario, ScenarioInitiative
from src.schemas.context import (
    TargetCreate,
    TargetListResponse,
    TargetProgressResponse,
    TargetResponse,
    TargetUpdate,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _compute_target_co2e(baseline_co2e_tonnes: float, target_value_pct: float) -> float:
    return round(baseline_co2e_tonnes * (1 - target_value_pct / 100), 4)


async def _get_target(
    db: AsyncSession, target_id: str, org_id: str
) -> EmissionTarget:
    result = await db.execute(
        select(EmissionTarget).where(
            EmissionTarget.id == target_id,
            EmissionTarget.organisation_id == org_id,
        )
    )
    t = result.scalar_one_or_none()
    if t is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Target {target_id!r} not found",
        )
    return t


def _to_response(t: EmissionTarget) -> TargetResponse:
    return TargetResponse.model_validate(t)


# ---------------------------------------------------------------------------
# Emissions total helper
# ---------------------------------------------------------------------------


async def _current_emissions_tonnes(
    db: AsyncSession,
    org_id: str,
    scope_coverage: list[int] | None = None,
) -> float:
    """Latest-year total CO₂e in tonnes for the org, optionally scoped."""
    # Find most recent year
    latest = await db.execute(
        select(func.max(EmissionRecord.year))
        .join(EmissionSource, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(CompanyUnit.organisation_id == org_id)
    )
    year = latest.scalar_one_or_none()
    if year is None:
        return 0.0

    stmt = (
        select(func.sum(EmissionRecord.co2e_kg))
        .join(EmissionSource, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(
            CompanyUnit.organisation_id == org_id,
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == "Location",
        )
    )
    if scope_coverage:
        stmt = stmt.where(EmissionRecord.scope.in_(scope_coverage))

    result = await db.execute(stmt)
    total_kg = result.scalar_one_or_none() or 0.0
    return round(total_kg / 1000, 4)


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


async def list_targets(
    db: AsyncSession, org_id: str
) -> TargetListResponse:
    result = await db.execute(
        select(EmissionTarget)
        .where(EmissionTarget.organisation_id == org_id)
        .order_by(EmissionTarget.target_year)
    )
    rows = list(result.scalars().all())
    return TargetListResponse(items=[_to_response(t) for t in rows], total=len(rows))


async def create_target(
    db: AsyncSession, org_id: str, payload: TargetCreate
) -> TargetResponse:
    if payload.target_year <= payload.baseline_year:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="target_year must be greater than baseline_year",
        )

    t = EmissionTarget(
        organisation_id=org_id,
        target_year=payload.target_year,
        target_type=payload.target_type,
        target_value_pct=payload.target_value_pct,
        baseline_year=payload.baseline_year,
        baseline_co2e_tonnes=payload.baseline_co2e_tonnes,
        target_co2e_tonnes=_compute_target_co2e(
            payload.baseline_co2e_tonnes, payload.target_value_pct
        ),
        scope_coverage=payload.scope_coverage,
        source=payload.source,
        notes=payload.notes,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return _to_response(t)


async def update_target(
    db: AsyncSession, org_id: str, target_id: str, payload: TargetUpdate
) -> TargetResponse:
    t = await _get_target(db, target_id, org_id)

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(t, field, val)

    # Recompute target_co2e_tonnes if relevant fields changed
    if payload.baseline_co2e_tonnes is not None or payload.target_value_pct is not None:
        t.target_co2e_tonnes = _compute_target_co2e(
            t.baseline_co2e_tonnes, t.target_value_pct
        )

    if t.target_year is not None and t.baseline_year is not None:
        if t.target_year <= t.baseline_year:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="target_year must be greater than baseline_year",
            )

    await db.commit()
    await db.refresh(t)
    return _to_response(t)


async def delete_target(
    db: AsyncSession, org_id: str, target_id: str
) -> None:
    t = await _get_target(db, target_id, org_id)
    await db.delete(t)
    await db.commit()


# ---------------------------------------------------------------------------
# Progress
# ---------------------------------------------------------------------------


async def get_target_progress(
    db: AsyncSession,
    org_id: str,
    target_id: str,
    scenario_id: str | None = None,
) -> TargetProgressResponse:
    t = await _get_target(db, target_id, org_id)

    current = await _current_emissions_tonnes(db, org_id, t.scope_coverage)

    # Scenario reduction: if scenario_id given, use that scenario;
    # otherwise use baseline; if no baseline, sum all included initiatives
    if scenario_id:
        scenario_result = await db.execute(
            select(Scenario).where(
                Scenario.id == scenario_id,
                Scenario.organisation_id == org_id,
            )
        )
        sc = scenario_result.scalar_one_or_none()
        if sc is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Scenario {scenario_id!r} not found",
            )
        reduction = await _scenario_reduction(db, scenario_id, t.scope_coverage)
    else:
        # Try baseline
        baseline_result = await db.execute(
            select(Scenario).where(
                Scenario.organisation_id == org_id,
                Scenario.is_baseline == True,
            )
        )
        baseline = baseline_result.scalar_one_or_none()
        if baseline:
            reduction = await _scenario_reduction(db, baseline.id, t.scope_coverage)
        else:
            # No baseline: no reduction
            reduction = 0.0

    projected = max(0.0, current - reduction)
    target_val = t.target_co2e_tonnes or _compute_target_co2e(
        t.baseline_co2e_tonnes, t.target_value_pct
    )
    gap = max(0.0, projected - target_val)
    on_track = gap == 0.0
    coverage_pct = min(100.0, round(reduction / current * 100, 2)) if current > 0 else 0.0
    years_remaining = t.target_year - datetime.datetime.utcnow().year

    return TargetProgressResponse(
        target=_to_response(t),
        current_co2e_tonnes=round(current, 4),
        scenario_reduction_co2e_tonnes=round(reduction, 4),
        projected_co2e_tonnes=round(projected, 4),
        gap_co2e_tonnes=round(gap, 4),
        on_track=on_track,
        coverage_pct=coverage_pct,
        years_remaining=years_remaining,
    )


async def _scenario_reduction(
    db: AsyncSession,
    scenario_id: str,
    scope_coverage: list[int] | None = None,
) -> float:
    """Sum of annual CO₂e reductions from included initiatives in a scenario."""
    stmt = (
        select(func.sum(AbatementInitiative.co2e_reduction_annual_tonnes))
        .join(
            ScenarioInitiative,
            ScenarioInitiative.initiative_id == AbatementInitiative.id,
        )
        .where(
            ScenarioInitiative.scenario_id == scenario_id,
            ScenarioInitiative.is_included == True,
        )
    )
    result = await db.execute(stmt)
    return round(result.scalar_one_or_none() or 0.0, 4)
