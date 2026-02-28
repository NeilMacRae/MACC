"""Scenario service — CRUD, initiative management, aggregation, comparison.

Aggregate metrics (computed in-memory after loading linked initiatives):
  total_capex_gbp                    = sum(capex_gbp) for included initiatives
  total_opex_annual_gbp              = sum(opex_annual_gbp) for included initiatives
  total_co2e_reduction_annual_tonnes = sum(co2e_reduction_annual_tonnes) for included
  residual_co2e_tonnes               = total org emissions - total_co2e_reduction
  weighted_avg_cost_per_tonne        = reduction-weighted average cost_per_tonne
  initiative_count                   = count of included initiatives

Baseline enforcement: only one scenario per org may have is_baseline=True.
Setting a new baseline automatically unsets the previous one.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException, status as http_status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.context import EmissionTarget, OrganisationalContext
from src.models.emissions import EmissionRecord, EmissionSource
from src.models.initiative import AbatementInitiative
from src.models.organisation import CompanyUnit
from src.models.scenario import Scenario, ScenarioInitiative
from src.schemas.scenarios import (
    AddInitiativesRequest,
    CompareResponse,
    ReorderRequest,
    ScenarioCreate,
    ScenarioDetailResponse,
    ScenarioInitiativeItem,
    ScenarioListResponse,
    ScenarioMACCBar,
    ScenarioMACCDataResponse,
    ScenarioMACCSummary,
    ScenarioResponse,
    ScenarioUpdate,
    SharedInitiativeItem,
    TargetAlignmentEntry,
    TargetAlignmentInfo,
    UniqueInitiativeItem,
    ScenarioCompareItem,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _load_scenario(
    db: AsyncSession, scenario_id: str, org_id: str
) -> Scenario:
    result = await db.execute(
        select(Scenario)
        .where(Scenario.id == scenario_id, Scenario.organisation_id == org_id)
        .options(
            selectinload(Scenario.initiative_links).selectinload(
                ScenarioInitiative.initiative
            )
        )
    )
    sc = result.scalar_one_or_none()
    if sc is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Scenario {scenario_id!r} not found",
        )
    return sc


async def _total_org_emissions_tonnes(db: AsyncSession, org_id: str) -> float:
    """Latest-year total CO₂e in tonnes for org (Location factor)."""
    latest = await db.execute(
        select(func.max(EmissionRecord.year))
        .join(EmissionSource, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(CompanyUnit.organisation_id == org_id)
    )
    year = latest.scalar_one_or_none()
    if year is None:
        return 0.0

    result = await db.execute(
        select(func.sum(EmissionRecord.co2e_kg))
        .join(EmissionSource, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(
            CompanyUnit.organisation_id == org_id,
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == "Location",
        )
    )
    kg = result.scalar_one_or_none() or 0.0
    return round(kg / 1000, 4)


def _aggregate_metrics(
    links: list[ScenarioInitiative], total_emissions: float
) -> dict[str, Any]:
    included = [lk for lk in links if lk.is_included]
    total_capex = round(sum(lk.initiative.capex_gbp for lk in included), 2)
    total_opex = round(
        sum((lk.initiative.opex_annual_gbp or 0.0) for lk in included), 2
    )
    total_reduction = round(
        sum(lk.initiative.co2e_reduction_annual_tonnes for lk in included), 4
    )
    residual = round(max(0.0, total_emissions - total_reduction), 4)

    # Weighted average cost per tonne
    if total_reduction > 0:
        weighted = sum(
            lk.initiative.cost_per_tonne * lk.initiative.co2e_reduction_annual_tonnes
            for lk in included
        )
        avg_cost = round(weighted / total_reduction, 4)
    else:
        avg_cost = 0.0

    return {
        "total_capex_gbp": total_capex,
        "total_opex_annual_gbp": total_opex,
        "total_co2e_reduction_annual_tonnes": total_reduction,
        "residual_co2e_tonnes": residual,
        "weighted_avg_cost_per_tonne": avg_cost,
        "initiative_count": len(included),
    }


def _to_response(sc: Scenario, metrics: dict[str, Any]) -> ScenarioResponse:
    return ScenarioResponse(
        id=sc.id,
        name=sc.name,
        description=sc.description,
        is_baseline=sc.is_baseline,
        created_at=sc.created_at,
        updated_at=sc.updated_at,
        **metrics,
    )


def _initiative_item(lk: ScenarioInitiative) -> ScenarioInitiativeItem:
    i = lk.initiative
    return ScenarioInitiativeItem(
        id=i.id,
        name=i.name,
        capex_gbp=i.capex_gbp,
        opex_annual_gbp=i.opex_annual_gbp,
        co2e_reduction_annual_tonnes=i.co2e_reduction_annual_tonnes,
        cost_per_tonne=i.cost_per_tonne,
        lifespan_years=i.lifespan_years,
        status=i.status,
        confidence=i.confidence,
        display_order=lk.display_order,
        is_included=lk.is_included,
    )


async def _build_target_alignment(
    db: AsyncSession,
    org_id: str,
    scenario_reduction: float,
    current_emissions: float,
) -> TargetAlignmentInfo:
    """Build target alignment for a scenario given its CO₂e reduction."""
    ctx_result = await db.execute(
        select(OrganisationalContext).where(
            OrganisationalContext.organisation_id == org_id
        )
    )
    ctx = ctx_result.scalar_one_or_none()
    if ctx is None:
        return TargetAlignmentInfo(has_targets=False)

    targets_result = await db.execute(
        select(EmissionTarget)
        .where(EmissionTarget.context_id == ctx.id)
        .order_by(EmissionTarget.target_year)
    )
    targets = list(targets_result.scalars().all())
    if not targets:
        return TargetAlignmentInfo(has_targets=False)

    projected = max(0.0, current_emissions - scenario_reduction)
    entries = []
    for t in targets:
        tco2e = t.target_co2e_tonnes or (
            t.baseline_co2e_tonnes * (1 - t.target_value_pct / 100)
        )
        gap = max(0.0, projected - tco2e)
        entries.append(
            TargetAlignmentEntry(
                id=t.id,
                target_year=t.target_year,
                target_type=t.target_type,
                target_value_pct=t.target_value_pct,
                baseline_co2e_tonnes=t.baseline_co2e_tonnes,
                target_co2e_tonnes=tco2e,
                projected_co2e_tonnes=round(projected, 4),
                gap_co2e_tonnes=round(gap, 4),
                on_track=gap == 0.0,
            )
        )

    return TargetAlignmentInfo(has_targets=True, targets=entries)


# ---------------------------------------------------------------------------
# Baseline enforcement
# ---------------------------------------------------------------------------


async def _unset_other_baselines(
    db: AsyncSession, org_id: str, exclude_id: str
) -> None:
    await db.execute(
        update(Scenario)
        .where(
            Scenario.organisation_id == org_id,
            Scenario.is_baseline == True,
            Scenario.id != exclude_id,
        )
        .values(is_baseline=False)
    )


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


async def create_scenario(
    db: AsyncSession, org_id: str, payload: ScenarioCreate
) -> ScenarioResponse:
    import uuid as _uuid

    sc = Scenario(
        id=str(_uuid.uuid4()),
        organisation_id=org_id,
        name=payload.name,
        description=payload.description,
        is_baseline=payload.is_baseline,
    )
    db.add(sc)

    if payload.is_baseline:
        await _unset_other_baselines(db, org_id, sc.id)

    # Add initiatives
    for order, init_id in enumerate(payload.initiative_ids, start=1):
        # Validate initiative belongs to org
        res = await db.execute(
            select(AbatementInitiative).where(
                AbatementInitiative.id == init_id,
                AbatementInitiative.organisation_id == org_id,
            )
        )
        if res.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Initiative {init_id!r} not found",
            )
        link = ScenarioInitiative(
            scenario_id=sc.id,
            initiative_id=init_id,
            display_order=order,
            is_included=True,
        )
        db.add(link)

    await db.commit()

    total_emissions = await _total_org_emissions_tonnes(db, org_id)
    sc = await _load_scenario(db, sc.id, org_id)
    metrics = _aggregate_metrics(sc.initiative_links, total_emissions)
    return _to_response(sc, metrics)


async def list_scenarios(
    db: AsyncSession, org_id: str
) -> ScenarioListResponse:
    result = await db.execute(
        select(Scenario)
        .where(Scenario.organisation_id == org_id)
        .options(
            selectinload(Scenario.initiative_links).selectinload(
                ScenarioInitiative.initiative
            )
        )
        .order_by(Scenario.created_at)
    )
    scenarios = list(result.scalars().all())
    total_emissions = await _total_org_emissions_tonnes(db, org_id)
    items = [_to_response(sc, _aggregate_metrics(sc.initiative_links, total_emissions)) for sc in scenarios]
    return ScenarioListResponse(items=items, total=len(items))


async def get_scenario(
    db: AsyncSession, org_id: str, scenario_id: str
) -> ScenarioDetailResponse:
    total_emissions = await _total_org_emissions_tonnes(db, org_id)
    sc = await _load_scenario(db, scenario_id, org_id)
    metrics = _aggregate_metrics(sc.initiative_links, total_emissions)

    sorted_links = sorted(sc.initiative_links, key=lambda lk: lk.display_order)
    initiative_items = [_initiative_item(lk) for lk in sorted_links]

    target_alignment = await _build_target_alignment(
        db, org_id, metrics["total_co2e_reduction_annual_tonnes"], total_emissions
    )

    return ScenarioDetailResponse(
        id=sc.id,
        name=sc.name,
        description=sc.description,
        is_baseline=sc.is_baseline,
        created_at=sc.created_at,
        updated_at=sc.updated_at,
        initiatives=initiative_items,
        target_alignment=target_alignment,
        **metrics,
    )


async def update_scenario(
    db: AsyncSession, org_id: str, scenario_id: str, payload: ScenarioUpdate
) -> ScenarioResponse:
    sc = await _load_scenario(db, scenario_id, org_id)

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(sc, field, val)
    sc.updated_at = datetime.utcnow()

    if payload.is_baseline:
        await _unset_other_baselines(db, org_id, sc.id)

    await db.commit()

    total_emissions = await _total_org_emissions_tonnes(db, org_id)
    sc = await _load_scenario(db, scenario_id, org_id)
    metrics = _aggregate_metrics(sc.initiative_links, total_emissions)
    return _to_response(sc, metrics)


async def delete_scenario(
    db: AsyncSession, org_id: str, scenario_id: str
) -> None:
    sc = await _load_scenario(db, scenario_id, org_id)
    await db.delete(sc)
    await db.commit()


# ---------------------------------------------------------------------------
# Initiative management
# ---------------------------------------------------------------------------


async def add_initiatives(
    db: AsyncSession,
    org_id: str,
    scenario_id: str,
    payload: AddInitiativesRequest,
) -> ScenarioDetailResponse:
    sc = await _load_scenario(db, scenario_id, org_id)

    # Current max order
    existing_ids = {lk.initiative_id for lk in sc.initiative_links}
    order = payload.display_order_start

    for init_id in payload.initiative_ids:
        if init_id in existing_ids:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Initiative {init_id!r} already in scenario",
            )
        # Validate initiative
        res = await db.execute(
            select(AbatementInitiative).where(
                AbatementInitiative.id == init_id,
                AbatementInitiative.organisation_id == org_id,
            )
        )
        if res.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Initiative {init_id!r} not found",
            )
        link = ScenarioInitiative(
            scenario_id=sc.id,
            initiative_id=init_id,
            display_order=order,
            is_included=True,
        )
        db.add(link)
        order += 1

    await db.commit()
    return await get_scenario(db, org_id, scenario_id)


async def remove_initiative(
    db: AsyncSession, org_id: str, scenario_id: str, initiative_id: str
) -> None:
    # Verify scenario belongs to org
    await _load_scenario(db, scenario_id, org_id)

    result = await db.execute(
        select(ScenarioInitiative).where(
            ScenarioInitiative.scenario_id == scenario_id,
            ScenarioInitiative.initiative_id == initiative_id,
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Initiative {initiative_id!r} not in scenario",
        )
    await db.delete(link)
    await db.commit()


async def reorder_initiatives(
    db: AsyncSession,
    org_id: str,
    scenario_id: str,
    payload: ReorderRequest,
) -> ScenarioDetailResponse:
    # Verify scenario belongs to org
    await _load_scenario(db, scenario_id, org_id)

    for item in payload.initiative_order:
        await db.execute(
            update(ScenarioInitiative)
            .where(
                ScenarioInitiative.scenario_id == scenario_id,
                ScenarioInitiative.initiative_id == item.initiative_id,
            )
            .values(display_order=item.display_order)
        )
    await db.commit()
    return await get_scenario(db, org_id, scenario_id)


# ---------------------------------------------------------------------------
# MACC data
# ---------------------------------------------------------------------------


async def get_macc_data(
    db: AsyncSession, org_id: str, scenario_id: str
) -> ScenarioMACCDataResponse:
    sc = await _load_scenario(db, scenario_id, org_id)
    total_emissions = await _total_org_emissions_tonnes(db, org_id)

    included = [lk for lk in sc.initiative_links if lk.is_included]
    # Sort by cost_per_tonne ascending
    included_sorted = sorted(included, key=lambda lk: lk.initiative.cost_per_tonne)

    bars: list[ScenarioMACCBar] = []
    x_start = 0.0
    total_capex = 0.0
    total_opex = 0.0
    neg_count = 0
    pos_count = 0

    for lk in included_sorted:
        i = lk.initiative
        width = i.co2e_reduction_annual_tonnes
        height = abs(i.cost_per_tonne)
        is_neg = i.cost_per_tonne < 0

        bars.append(
            ScenarioMACCBar(
                initiative_id=i.id,
                initiative_name=i.name,
                width=round(width, 4),
                height=round(height, 4),
                x_start=round(x_start, 4),
                cost_per_tonne=round(i.cost_per_tonne, 4),
                co2e_reduction_annual_tonnes=round(width, 4),
                capex_gbp=i.capex_gbp,
                opex_annual_gbp=i.opex_annual_gbp,
                status=i.status,
                confidence=i.confidence,
                is_negative_cost=is_neg,
            )
        )
        x_start += width
        total_capex += i.capex_gbp
        total_opex += i.opex_annual_gbp or 0.0
        if is_neg:
            neg_count += 1
        else:
            pos_count += 1

    total_reduction = round(sum(b.co2e_reduction_annual_tonnes for b in bars), 4)
    if total_reduction > 0:
        avg_cost = round(
            sum(b.cost_per_tonne * b.co2e_reduction_annual_tonnes for b in bars)
            / total_reduction,
            4,
        )
    else:
        avg_cost = 0.0

    return ScenarioMACCDataResponse(
        scenario_id=sc.id,
        scenario_name=sc.name,
        total_emissions_co2e_tonnes=total_emissions,
        total_reduction_co2e_tonnes=total_reduction,
        bars=bars,
        summary=ScenarioMACCSummary(
            total_capex_gbp=round(total_capex, 2),
            total_opex_annual_gbp=round(total_opex, 2),
            net_negative_cost_initiatives=neg_count,
            net_positive_cost_initiatives=pos_count,
            weighted_avg_cost_per_tonne=avg_cost,
        ),
    )


# ---------------------------------------------------------------------------
# Compare
# ---------------------------------------------------------------------------


async def compare_scenarios(
    db: AsyncSession, org_id: str, scenario_ids: list[str]
) -> CompareResponse:
    if len(scenario_ids) < 2:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="At least 2 scenario_ids required for comparison",
        )

    total_emissions = await _total_org_emissions_tonnes(db, org_id)

    # Load all requested scenarios
    scenarios: list[Scenario] = []
    for sid in scenario_ids:
        sc = await _load_scenario(db, sid, org_id)
        scenarios.append(sc)

    # Load targets for gap calculation
    ctx_result = await db.execute(
        select(OrganisationalContext).where(
            OrganisationalContext.organisation_id == org_id
        )
    )
    ctx = ctx_result.scalar_one_or_none()
    targets: list[EmissionTarget] = []
    if ctx:
        t_result = await db.execute(
            select(EmissionTarget).where(EmissionTarget.context_id == ctx.id)
        )
        targets = list(t_result.scalars().all())

    # Build per-scenario items
    compare_items: list[ScenarioCompareItem] = []
    scenario_initiative_sets: dict[str, set[str]] = {}

    for sc in scenarios:
        metrics = _aggregate_metrics(sc.initiative_links, total_emissions)
        included_ids = {
            lk.initiative_id for lk in sc.initiative_links if lk.is_included
        }
        scenario_initiative_sets[sc.id] = included_ids

        # Meets targets?
        projected = max(0.0, total_emissions - metrics["total_co2e_reduction_annual_tonnes"])
        meets = True
        gap_pct = 0.0
        for t in targets:
            tco2e = t.target_co2e_tonnes or (
                t.baseline_co2e_tonnes * (1 - t.target_value_pct / 100)
            )
            if projected > tco2e:
                meets = False
                if t.baseline_co2e_tonnes > 0:
                    gap_pct = max(
                        gap_pct,
                        round((projected - tco2e) / t.baseline_co2e_tonnes * 100, 2),
                    )

        compare_items.append(
            ScenarioCompareItem(
                id=sc.id,
                name=sc.name,
                is_baseline=sc.is_baseline,
                total_capex_gbp=metrics["total_capex_gbp"],
                total_opex_annual_gbp=metrics["total_opex_annual_gbp"],
                total_co2e_reduction_annual_tonnes=metrics["total_co2e_reduction_annual_tonnes"],
                residual_co2e_tonnes=metrics["residual_co2e_tonnes"],
                initiative_count=metrics["initiative_count"],
                avg_cost_per_tonne=metrics["weighted_avg_cost_per_tonne"],
                meets_targets=meets,
                gap_to_target_pct=gap_pct,
            )
        )

    # Shared / unique initiatives
    all_ids: set[str] = set()
    for s in scenario_initiative_sets.values():
        all_ids |= s

    shared: list[SharedInitiativeItem] = []
    unique: dict[str, list[UniqueInitiativeItem]] = {sid: [] for sid in scenario_ids}

    # Load initiative names
    if all_ids:
        result = await db.execute(
            select(AbatementInitiative).where(AbatementInitiative.id.in_(all_ids))
        )
        init_map = {i.id: i.name for i in result.scalars().all()}
    else:
        init_map = {}

    for iid in all_ids:
        in_scenarios = [sid for sid in scenario_ids if iid in scenario_initiative_sets[sid]]
        name = init_map.get(iid, iid)
        if len(in_scenarios) > 1:
            shared.append(SharedInitiativeItem(id=iid, name=name, in_scenarios=in_scenarios))
        else:
            sid = in_scenarios[0]
            unique[sid].append(UniqueInitiativeItem(id=iid, name=name))

    return CompareResponse(
        scenarios=compare_items,
        shared_initiatives=shared,
        unique_initiatives=unique,
    )
