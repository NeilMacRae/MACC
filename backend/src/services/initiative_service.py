"""Initiative service — CRUD, status state machine, overlap detection.

All public functions accept an AsyncSession and an organisation_id (str) for
multi-tenant isolation.  cost_per_tonne is computed as:
  (capex_gbp + opex_annual_gbp * lifespan_years) / co2e_reduction_annual_tonnes
payback_years is computed as capex_gbp / abs(opex_annual_gbp) when opex < 0.

Status transition rules (enforced here, not in Pydantic):
    idea        → planned, rejected
    planned     → approved, rejected
    approved    → in_progress, rejected
    in_progress → completed, rejected
    completed   → (terminal)
    rejected    → (terminal)
"""

from __future__ import annotations

import math
from typing import Any

from fastapi import HTTPException, status as http_status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.emissions import EmissionRecord, EmissionSource
from src.models.initiative import AbatementInitiative, InitiativeEmissionSource
from src.models.organisation import CompanyUnit
from src.schemas.initiatives import (
    BulkValidateResponse,
    InitiativeCreate,
    InitiativeListItem,
    InitiativeListResponse,
    InitiativeResponse,
    InitiativeUpdate,
    OverlapResponse,
    StatusUpdate,
    STATUS_TRANSITIONS,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _compute_cost_per_tonne(
    capex_gbp: float,
    opex_annual_gbp: float | None,
    lifespan_years: int,
    co2e_reduction_annual_tonnes: float,
) -> float:
    """Lifecycle cost per tonne: (capex + opex*years) / annual_reduction."""
    if co2e_reduction_annual_tonnes <= 0:
        return 0.0
    opex = opex_annual_gbp or 0.0
    return round(
        (capex_gbp + opex * lifespan_years) / co2e_reduction_annual_tonnes, 4
    )


def _compute_payback_years(capex_gbp: float, opex_annual_gbp: float | None) -> float | None:
    """Payback years = capex / |opex| when opex is negative, else None."""
    if opex_annual_gbp is None or opex_annual_gbp >= 0:
        return None
    return round(capex_gbp / abs(opex_annual_gbp), 4)


async def _load_full(db: AsyncSession, initiative_id: str, org_id: str) -> AbatementInitiative:
    """Load a single initiative with all relationships, raising 404 if missing."""
    result = await db.execute(
        select(AbatementInitiative)
        .where(
            AbatementInitiative.id == initiative_id,
            AbatementInitiative.organisation_id == org_id,
        )
        .options(
            selectinload(AbatementInitiative.emission_source_links).selectinload(
                InitiativeEmissionSource.emission_source
            ),
            selectinload(AbatementInitiative.scenario_links),
        )
    )
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Initiative {initiative_id!r} not found",
        )
    return obj


async def _source_co2e(db: AsyncSession, source_id: str) -> float:
    """Total CO₂e in tonnes for a source across all years/months (Location)."""
    result = await db.execute(
        select(func.sum(EmissionRecord.co2e_kg))
        .where(
            EmissionRecord.emission_source_id == source_id,
            EmissionRecord.market_factor_type == "Location",
        )
    )
    total_kg: float = result.scalar_one_or_none() or 0.0
    return round(total_kg / 1000.0, 4)


# ---------------------------------------------------------------------------
# Response builders
# ---------------------------------------------------------------------------


async def _to_response(initiative: AbatementInitiative) -> InitiativeResponse:
    """Map ORM object to Pydantic response.

    The initiative must have been loaded with selectinload on
    emission_source_links and scenario_links.
    """
    from src.schemas.initiatives import EmissionSourceLink, ScenarioRef

    sources: list[EmissionSourceLink] = []
    for link in initiative.emission_source_links:
        src: EmissionSource = link.emission_source
        cu: CompanyUnit | None = getattr(src, "company_unit", None)
        # Sum all Location records for this source
        total_co2e_kg: float = sum(
            r.co2e_kg
            for r in src.records
            if r.market_factor_type == "Location"
        ) if hasattr(src, "records") and src.records else 0.0

        sources.append(
            EmissionSourceLink(
                id=src.id,
                activity=src.activity,
                question=src.question,
                question_group=src.question_group,
                answer_unit=src.answer_unit,
                co2e_tonnes=round(total_co2e_kg / 1000.0, 4),
                company_unit_name=cu.company_unit_name if cu else None,
                company_unit_type=cu.company_unit_type if cu else None,
            )
        )

    scenarios: list[ScenarioRef] = []
    for sl in initiative.scenario_links:
        sc = sl.scenario if hasattr(sl, "scenario") else None
        if sc:
            scenarios.append(
                ScenarioRef(id=sc.id, name=sc.name, is_baseline=sc.is_baseline)
            )

    return InitiativeResponse(
        id=initiative.id,
        name=initiative.name,
        description=initiative.description,
        initiative_type=initiative.initiative_type,
        status=initiative.status,
        capex_gbp=initiative.capex_gbp,
        opex_annual_gbp=initiative.opex_annual_gbp,
        co2e_reduction_annual_tonnes=initiative.co2e_reduction_annual_tonnes,
        cost_per_tonne=initiative.cost_per_tonne,
        payback_years=initiative.payback_years,
        lifespan_years=initiative.lifespan_years,
        owner=initiative.owner,
        confidence=initiative.confidence,
        notes=initiative.notes,
        source_suggestion_id=initiative.source_suggestion_id,
        emission_sources=sources,
        scenarios=scenarios,
        warnings=[],
        created_at=initiative.created_at,
        updated_at=initiative.updated_at,
    )


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


async def create_initiative(
    db: AsyncSession, org_id: str, payload: InitiativeCreate
) -> InitiativeResponse:
    """Create a new initiative and link emission sources."""
    # Validate all source IDs exist within the org
    for src_id in payload.emission_source_ids:
        result = await db.execute(
            select(EmissionSource)
            .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
            .where(
                EmissionSource.id == src_id,
                CompanyUnit.organisation_id == org_id,
            )
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Emission source {src_id!r} not found in this organisation",
            )

    lifespan = payload.lifespan_years
    cost_per_tonne = _compute_cost_per_tonne(
        payload.capex_gbp, payload.opex_annual_gbp, lifespan, payload.co2e_reduction_annual_tonnes
    )
    payback_years = _compute_payback_years(payload.capex_gbp, payload.opex_annual_gbp)

    initiative = AbatementInitiative(
        organisation_id=org_id,
        name=payload.name,
        description=payload.description,
        initiative_type=payload.initiative_type,
        status=payload.status,
        capex_gbp=payload.capex_gbp,
        opex_annual_gbp=payload.opex_annual_gbp,
        co2e_reduction_annual_tonnes=payload.co2e_reduction_annual_tonnes,
        cost_per_tonne=cost_per_tonne,
        payback_years=payback_years,
        lifespan_years=lifespan,
        owner=payload.owner,
        confidence=payload.confidence,
        notes=payload.notes,
    )
    db.add(initiative)
    await db.flush()  # get the id

    for src_id in payload.emission_source_ids:
        db.add(
            InitiativeEmissionSource(
                initiative_id=initiative.id,
                emission_source_id=src_id,
            )
        )

    await db.commit()

    # Reload with relationships
    loaded = await _load_full(db, initiative.id, org_id)
    # Eagerly load source records for co2e calculation
    for link in loaded.emission_source_links:
        await db.refresh(link.emission_source, ["records", "company_unit"])

    response = await _to_response(loaded)
    # Non-blocking over-reduction warning
    co2e_values: list[float] = []
    for link in loaded.emission_source_links:
        co2e_values.append(await _source_co2e(db, link.emission_source_id))
    total_source_co2e = sum(co2e_values)
    if total_source_co2e > 0 and loaded.co2e_reduction_annual_tonnes > total_source_co2e:
        from src.schemas.initiatives import InitiativeWarning
        response.warnings.append(
            InitiativeWarning(
                code="over_reduction",
                message=(
                    f"Annual reduction of {loaded.co2e_reduction_annual_tonnes}t "
                    f"exceeds source total of {round(total_source_co2e, 2)}t"
                ),
            )
        )
    return response


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


async def list_initiatives(
    db: AsyncSession,
    org_id: str,
    statuses: list[str] | None = None,
    initiative_type: str | None = None,
    scope: int | None = None,
    sort_by: str = "cost_per_tonne",
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 50,
) -> InitiativeListResponse:
    """Return paginated list of initiatives."""
    page_size = min(page_size, 100)
    page = max(page, 1)

    stmt = select(AbatementInitiative).where(
        AbatementInitiative.organisation_id == org_id
    )

    if statuses:
        stmt = stmt.where(AbatementInitiative.status.in_(statuses))
    if initiative_type:
        stmt = stmt.where(AbatementInitiative.initiative_type == initiative_type)

    # Scope filter requires joining through links → records
    if scope is not None:
        stmt = (
            stmt.join(
                InitiativeEmissionSource,
                AbatementInitiative.id == InitiativeEmissionSource.initiative_id,
            )
            .join(
                EmissionRecord,
                InitiativeEmissionSource.emission_source_id == EmissionRecord.emission_source_id,
            )
            .where(EmissionRecord.scope == scope)
            .distinct()
        )

    # Sort column mapping
    sort_col_map: dict[str, Any] = {
        "cost_per_tonne": AbatementInitiative.cost_per_tonne,
        "co2e_reduction": AbatementInitiative.co2e_reduction_annual_tonnes,
        "cost": AbatementInitiative.capex_gbp,
        "name": AbatementInitiative.name,
        "created_at": AbatementInitiative.created_at,
    }
    sort_col = sort_col_map.get(sort_by, AbatementInitiative.cost_per_tonne)
    if sort_order == "desc":
        stmt = stmt.order_by(sort_col.desc())
    else:
        stmt = stmt.order_by(sort_col.asc())

    # Count total
    count_result = await db.execute(
        select(func.count()).select_from(stmt.subquery())
    )
    total: int = count_result.scalar_one_or_none() or 0

    # Paginate + load link counts
    stmt = (
        stmt.options(
            selectinload(AbatementInitiative.emission_source_links),
            selectinload(AbatementInitiative.scenario_links),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    results = await db.execute(stmt)
    rows = results.scalars().all()

    items: list[InitiativeListItem] = []
    for r in rows:
        items.append(
            InitiativeListItem(
                id=r.id,
                name=r.name,
                initiative_type=r.initiative_type,
                status=r.status,
                capex_gbp=r.capex_gbp,
                co2e_reduction_annual_tonnes=r.co2e_reduction_annual_tonnes,
                cost_per_tonne=r.cost_per_tonne,
                owner=r.owner,
                confidence=r.confidence,
                emission_source_count=len(r.emission_source_links),
                scenario_count=len(r.scenario_links),
                created_at=r.created_at,
            )
        )

    return InitiativeListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


# ---------------------------------------------------------------------------
# Get detail
# ---------------------------------------------------------------------------


async def get_initiative(
    db: AsyncSession, org_id: str, initiative_id: str
) -> InitiativeResponse:
    loaded = await _load_full(db, initiative_id, org_id)
    for link in loaded.emission_source_links:
        await db.refresh(link.emission_source, ["records", "company_unit"])
    return await _to_response(loaded)


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


async def update_initiative(
    db: AsyncSession, org_id: str, initiative_id: str, payload: InitiativeUpdate
) -> InitiativeResponse:
    """Update fields.  Status transitions are validated if status changes."""
    obj = await _load_full(db, initiative_id, org_id)

    if payload.status is not None and payload.status != obj.status:
        allowed = STATUS_TRANSITIONS.get(obj.status, set())
        if payload.status not in allowed:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Invalid status transition from {obj.status!r} to {payload.status!r}"
                ),
            )
        obj.status = payload.status

    if payload.name is not None:
        obj.name = payload.name
    if payload.description is not None:
        obj.description = payload.description
    if payload.initiative_type is not None:
        obj.initiative_type = payload.initiative_type
    if payload.capex_gbp is not None:
        obj.capex_gbp = payload.capex_gbp
    # opex_annual_gbp can be set to None to clear it — use explicit key presence check
    if "opex_annual_gbp" in payload.model_fields_set:
        obj.opex_annual_gbp = payload.opex_annual_gbp
    if payload.co2e_reduction_annual_tonnes is not None:
        obj.co2e_reduction_annual_tonnes = payload.co2e_reduction_annual_tonnes
    if payload.lifespan_years is not None:
        obj.lifespan_years = payload.lifespan_years
    if payload.owner is not None:
        obj.owner = payload.owner
    if payload.confidence is not None:
        obj.confidence = payload.confidence
    if payload.notes is not None:
        obj.notes = payload.notes

    # Recompute derived fields whenever any input changes
    obj.cost_per_tonne = _compute_cost_per_tonne(
        obj.capex_gbp, obj.opex_annual_gbp, obj.lifespan_years, obj.co2e_reduction_annual_tonnes
    )
    obj.payback_years = _compute_payback_years(obj.capex_gbp, obj.opex_annual_gbp)

    # Update emission source links if provided
    if payload.emission_source_ids is not None:
        if len(payload.emission_source_ids) == 0:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="emission_source_ids must contain at least one entry",
            )
        # Validate all new sources belong to the org
        for src_id in payload.emission_source_ids:
            result = await db.execute(
                select(EmissionSource)
                .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
                .where(
                    EmissionSource.id == src_id,
                    CompanyUnit.organisation_id == org_id,
                )
            )
            if result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Emission source {src_id!r} not found",
                )
        # Remove existing links
        for link in list(obj.emission_source_links):
            await db.delete(link)
        await db.flush()
        # Add new links
        for src_id in payload.emission_source_ids:
            db.add(
                InitiativeEmissionSource(
                    initiative_id=obj.id,
                    emission_source_id=src_id,
                )
            )

    await db.commit()
    reloaded = await _load_full(db, initiative_id, org_id)
    for link in reloaded.emission_source_links:
        await db.refresh(link.emission_source, ["records", "company_unit"])
    return await _to_response(reloaded)


# ---------------------------------------------------------------------------
# Status transition (PATCH)
# ---------------------------------------------------------------------------


async def update_status(
    db: AsyncSession, org_id: str, initiative_id: str, payload: StatusUpdate
) -> InitiativeResponse:
    obj = await _load_full(db, initiative_id, org_id)
    allowed = STATUS_TRANSITIONS.get(obj.status, set())
    if payload.status not in allowed:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status transition from {obj.status!r} to {payload.status!r}",
        )
    obj.status = payload.status
    if payload.notes:
        obj.notes = (obj.notes or "") + f"\n[Status → {payload.status}]: {payload.notes}"
    await db.commit()
    reloaded = await _load_full(db, initiative_id, org_id)
    for link in reloaded.emission_source_links:
        await db.refresh(link.emission_source, ["records", "company_unit"])
    return await _to_response(reloaded)


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


async def delete_initiative(
    db: AsyncSession, org_id: str, initiative_id: str
) -> None:
    """Delete initiative.  Raises 409 if status is 'in_progress'."""
    result = await db.execute(
        select(AbatementInitiative).where(
            AbatementInitiative.id == initiative_id,
            AbatementInitiative.organisation_id == org_id,
        )
    )
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Initiative {initiative_id!r} not found",
        )
    if obj.status == "in_progress":
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete initiative with status 'in_progress'. "
                "Set status to 'rejected' first."
            ),
        )
    await db.delete(obj)
    await db.commit()


# ---------------------------------------------------------------------------
# Overlap detection
# ---------------------------------------------------------------------------


async def get_overlap(
    db: AsyncSession, org_id: str, initiative_id: str
) -> OverlapResponse:
    """Return initiatives sharing emission sources with the target initiative."""
    target = await _load_full(db, initiative_id, org_id)
    target_source_ids: set[str] = {
        link.emission_source_id for link in target.emission_source_links
    }

    if not target_source_ids:
        return OverlapResponse(
            initiative_id=initiative_id,
            overlapping_initiatives=[],
            total_overlap_co2e_tonnes=0.0,
        )

    # Find other initiatives with shared sources
    result = await db.execute(
        select(AbatementInitiative)
        .where(
            AbatementInitiative.organisation_id == org_id,
            AbatementInitiative.id != initiative_id,
        )
        .options(
            selectinload(AbatementInitiative.emission_source_links).selectinload(
                InitiativeEmissionSource.emission_source
            )
        )
    )
    others = result.scalars().all()

    from src.schemas.initiatives import OverlappingInitiativeInfo, SharedSourceInfo

    overlapping = []
    total_overlap_kg = 0.0

    for other in others:
        other_source_ids = {link.emission_source_id for link in other.emission_source_links}
        shared_ids = target_source_ids & other_source_ids
        if not shared_ids:
            continue

        shared_infos = []
        shared_kg = 0.0
        for link in other.emission_source_links:
            if link.emission_source_id not in shared_ids:
                continue
            src = link.emission_source
            co2e_t = await _source_co2e(db, src.id)
            shared_infos.append(
                SharedSourceInfo(
                    id=src.id,
                    activity=src.activity,
                    question_group=src.question_group,
                    co2e_tonnes=co2e_t,
                )
            )
            shared_kg += co2e_t * 1000

        # Combined reduction % for shared sources
        combined_reduction = target.co2e_reduction_annual_tonnes + other.co2e_reduction_annual_tonnes
        total_source_co2e = sum(si.co2e_tonnes for si in shared_infos)
        combined_pct = (
            round(combined_reduction / total_source_co2e * 100, 1)
            if total_source_co2e > 0
            else 0.0
        )
        warning = (
            "Combined reductions exceed 100% of source emissions"
            if combined_pct > 100
            else ""
        )

        overlapping.append(
            OverlappingInitiativeInfo(
                id=other.id,
                name=other.name,
                shared_sources=shared_infos,
                combined_reduction_pct=combined_pct,
                warning=warning,
            )
        )
        total_overlap_kg += shared_kg

    return OverlapResponse(
        initiative_id=initiative_id,
        overlapping_initiatives=overlapping,
        total_overlap_co2e_tonnes=round(total_overlap_kg / 1000.0, 4),
    )


# ---------------------------------------------------------------------------
# Bulk validate
# ---------------------------------------------------------------------------


async def bulk_validate(
    db: AsyncSession, org_id: str, initiative_ids: list[str]
) -> BulkValidateResponse:
    """Validate that each initiative's co2e_reduction_tonnes ≤ total source co2e."""
    from src.schemas.initiatives import ValidationIssue

    issues: list[ValidationIssue] = []

    for init_id in initiative_ids:
        result = await db.execute(
            select(AbatementInitiative)
            .where(
                AbatementInitiative.id == init_id,
                AbatementInitiative.organisation_id == org_id,
            )
            .options(
                selectinload(AbatementInitiative.emission_source_links).selectinload(
                    InitiativeEmissionSource.emission_source
                )
            )
        )
        obj = result.scalar_one_or_none()
        if obj is None:
            issues.append(
                ValidationIssue(
                    initiative_id=init_id,
                    issue_type="not_found",
                    message=f"Initiative {init_id!r} not found",
                )
            )
            continue

        total_source_co2e = 0.0
        for link in obj.emission_source_links:
            total_source_co2e += await _source_co2e(db, link.emission_source_id)

        if obj.co2e_reduction_annual_tonnes > total_source_co2e > 0:
            issues.append(
                ValidationIssue(
                    initiative_id=init_id,
                    issue_type="over_reduction",
                    message=(
                        f"Reduction of {obj.co2e_reduction_annual_tonnes}t "
                        f"exceeds source total of {round(total_source_co2e, 2)}t"
                    ),
                )
            )

    return BulkValidateResponse(valid=len(issues) == 0, issues=issues)
