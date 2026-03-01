"""Emissions service: all query logic for the /emissions endpoints.

Uses async SQLAlchemy 2.x.  Tree traversal is done in Python (after one
bulk load) rather than recursive CTEs so the logic is portable across
SQLite/Postgres and easy to test.
"""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.organisation import Organisation, CompanyUnit
from src.models.emissions import EmissionSource, EmissionRecord
from src.schemas.emissions import (
    ByScopeBreakdown,
    ChildUnitSummary,
    EmissionsOverviewResponse,
    HierarchyNodeResponse,
    HierarchyResponse,
    QuestionGroupEntry,
    RecordDetail,
    SourceDetail,
    SourceListResponse,
    SourceSummary,
    ScopeEntry,
    TopSource,
    TrendPoint,
    TrendsResponse,
    UnitDetailResponse,
)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _kg_to_tonnes(kg: float) -> float:
    return round(kg / 1000, 4)


def _pct(part: float, total: float) -> float:
    if total == 0:
        return 0.0
    return round(part / total * 100, 2)


def _scope_breakdown(by_scope: dict[int, float], total_kg: float) -> ByScopeBreakdown:
    return ByScopeBreakdown(
        scope_1=ScopeEntry(
            co2e_tonnes=_kg_to_tonnes(by_scope.get(1, 0.0)),
            percentage=_pct(by_scope.get(1, 0.0), total_kg),
        ),
        scope_2=ScopeEntry(
            co2e_tonnes=_kg_to_tonnes(by_scope.get(2, 0.0)),
            percentage=_pct(by_scope.get(2, 0.0), total_kg),
        ),
        scope_3=ScopeEntry(
            co2e_tonnes=_kg_to_tonnes(by_scope.get(3, 0.0)),
            percentage=_pct(by_scope.get(3, 0.0), total_kg),
        ),
    )


async def _get_org(db: AsyncSession, organisation_id: str) -> Organisation:
    result = await db.execute(
        select(Organisation).where(Organisation.id == organisation_id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise ValueError(f"Organisation {organisation_id!r} not found")
    return org


async def _latest_year(db: AsyncSession, organisation_id: str) -> int | None:
    """Return the most recent emission year for an organisation."""
    result = await db.execute(
        select(func.max(EmissionRecord.year))
        .join(EmissionSource, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(CompanyUnit.organisation_id == organisation_id)
    )
    return result.scalar_one_or_none()


async def _all_units(db: AsyncSession, organisation_id: str) -> list[CompanyUnit]:
    """Load all CompanyUnits for an org in a single query."""
    result = await db.execute(
        select(CompanyUnit)
        .where(CompanyUnit.organisation_id == organisation_id)
        .order_by(CompanyUnit.company_unit_id)
    )
    return list(result.scalars().all())


def _build_children_map(units: list[CompanyUnit]) -> dict[int | None, list[CompanyUnit]]:
    """Map immediate_parent_id → list[CompanyUnit]."""
    m: dict[int | None, list[CompanyUnit]] = defaultdict(list)
    for u in units:
        m[u.immediate_parent_id].append(u)
    return m


def _descendants(unit: CompanyUnit, children_map: dict[int | None, list[CompanyUnit]]) -> list[CompanyUnit]:
    """Return all descendants (including self) of a unit."""
    result = [unit]
    for child in children_map.get(unit.company_unit_id, []):
        result.extend(_descendants(child, children_map))
    return result


# ── Overview ──────────────────────────────────────────────────────────────────

async def get_overview(
    db: AsyncSession,
    organisation_id: str,
    year: int | None,
    market_factor_type: str,
) -> EmissionsOverviewResponse:
    org = await _get_org(db, organisation_id)

    if year is None:
        year = await _latest_year(db, organisation_id)
    if year is None:
        year = 2024  # fallback

    # Available years
    yrs_result = await db.execute(
        select(EmissionRecord.year)
        .distinct()
        .join(EmissionSource, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(CompanyUnit.organisation_id == organisation_id)
        .order_by(EmissionRecord.year)
    )
    available_years = [r[0] for r in yrs_result.all()]

    # Aggregate by scope
    scope_result = await db.execute(
        select(EmissionRecord.scope, func.sum(EmissionRecord.co2e_kg))
        .join(EmissionSource, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(
            CompanyUnit.organisation_id == organisation_id,
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .group_by(EmissionRecord.scope)
    )
    by_scope: dict[int, float] = {row[0]: float(row[1]) for row in scope_result.all()}
    total_kg = sum(by_scope.values())

    # By question group
    qg_result = await db.execute(
        select(EmissionSource.question_group, func.sum(EmissionRecord.co2e_kg))
        .join(EmissionRecord, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(
            CompanyUnit.organisation_id == organisation_id,
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .group_by(EmissionSource.question_group)
        .order_by(func.sum(EmissionRecord.co2e_kg).desc())
    )
    by_qg = [
        QuestionGroupEntry(
            question_group=row[0],
            co2e_tonnes=_kg_to_tonnes(float(row[1])),
            percentage=_pct(float(row[1]), total_kg),
        )
        for row in qg_result.all()
    ]

    # Top sources (top 10 by CO2e, one row per source×scope)
    top_result = await db.execute(
        select(
            EmissionSource.id,
            EmissionSource.activity,
            EmissionSource.question,
            EmissionSource.question_group,
            EmissionRecord.scope,
            func.sum(EmissionRecord.co2e_kg),
        )
        .join(EmissionRecord, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(
            CompanyUnit.organisation_id == organisation_id,
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .group_by(EmissionSource.id, EmissionRecord.scope)
        .order_by(func.sum(EmissionRecord.co2e_kg).desc())
        .limit(10)
    )
    top_sources = [
        TopSource(
            source_id=row[0],
            activity=row[1],
            question=row[2],
            question_group=row[3],
            scope=row[4],
            co2e_tonnes=_kg_to_tonnes(float(row[5])),
            percentage=_pct(float(row[5]), total_kg),
        )
        for row in top_result.all()
    ]

    return EmissionsOverviewResponse(
        organisation_id=org.id,
        organisation_name=org.company,
        year=year,
        market_factor_type=market_factor_type,
        total_co2e_tonnes=_kg_to_tonnes(total_kg),
        by_scope=_scope_breakdown(by_scope, total_kg),
        by_question_group=by_qg,
        top_sources=top_sources,
        available_years=available_years,
    )


# ── Hierarchy ─────────────────────────────────────────────────────────────────

async def get_hierarchy(
    db: AsyncSession,
    organisation_id: str,
    reporting_year: int | None,
    market_factor_type: str,
    parent_id: str | None,
    depth: int | None,
    include_closed: bool,
) -> HierarchyResponse:
    if reporting_year is None:
        reporting_year = await _latest_year(db, organisation_id)
    if reporting_year is None:
        reporting_year = 2024

    units = await _all_units(db, organisation_id)
    if not include_closed:
        from datetime import date
        today = date.today()
        units = [u for u in units if u.close_date is None or u.close_date >= today]

    # Aggregate co2e_kg per company_unit_id (UUID) for the given year + mft
    agg_result = await db.execute(
        select(CompanyUnit.id, func.sum(EmissionRecord.co2e_kg))
        .join(EmissionSource, EmissionSource.company_unit_id == CompanyUnit.id)
        .join(EmissionRecord, EmissionRecord.emission_source_id == EmissionSource.id)
        .where(
            CompanyUnit.organisation_id == organisation_id,
            EmissionRecord.year == reporting_year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .group_by(CompanyUnit.id)
    )
    direct_kg: dict[str, float] = {row[0]: float(row[1]) for row in agg_result.all()}

    children_map = _build_children_map(units)
    unit_by_cuid: dict[int, CompanyUnit] = {u.company_unit_id: u for u in units}

    def subtree_kg(unit: CompanyUnit) -> float:
        total = direct_kg.get(unit.id, 0.0)
        for child in children_map.get(unit.company_unit_id, []):
            total += subtree_kg(child)
        return total

    def build_node(unit: CompanyUnit, current_depth: int) -> HierarchyNodeResponse:
        children_nodes: list[HierarchyNodeResponse] = []
        if depth is None or current_depth < depth:
            for child in sorted(
                children_map.get(unit.company_unit_id, []),
                key=lambda u: u.company_unit_name,
            ):
                children_nodes.append(build_node(child, current_depth + 1))
        return HierarchyNodeResponse(
            id=unit.id,
            company_unit_id=unit.company_unit_id,
            company_unit_name=unit.company_unit_name,
            company_unit_type=unit.company_unit_type,
            facility_type=unit.facility_type,
            country=unit.country,
            country_code=unit.country_code,
            total_co2e_tonnes=_kg_to_tonnes(subtree_kg(unit)),
            children=children_nodes,
        )

    # Find root: prefer the one whose immediate_parent_id is not in the unit set
    # (i.e., no parent within this org)
    if parent_id:
        root_unit_result = await db.execute(
            select(CompanyUnit).where(
                CompanyUnit.id == parent_id,
                CompanyUnit.organisation_id == organisation_id,
            )
        )
        root_unit = root_unit_result.scalar_one_or_none()
        if root_unit is None:
            raise ValueError(f"Unit {parent_id!r} not found")
    else:
        known_cuids = {u.company_unit_id for u in units}
        roots = [u for u in units if u.immediate_parent_id not in known_cuids]
        if not roots:
            raise ValueError("No root unit found for organisation")
        # Pick the one with the most total emissions as the primary root
        roots.sort(key=lambda u: subtree_kg(u), reverse=True)
        root_unit = roots[0]

    return HierarchyResponse(root=build_node(root_unit, 0), reporting_year=reporting_year)


# ── Unit Detail ───────────────────────────────────────────────────────────────

async def get_unit_detail(
    db: AsyncSession,
    organisation_id: str,
    unit_id: str,
    year: int | None,
    market_factor_type: str,
) -> UnitDetailResponse:
    if year is None:
        year = await _latest_year(db, organisation_id)
    if year is None:
        year = 2024

    # Load the unit
    unit_result = await db.execute(
        select(CompanyUnit).where(
            CompanyUnit.id == unit_id,
            CompanyUnit.organisation_id == organisation_id,
        )
    )
    unit = unit_result.scalar_one_or_none()
    if unit is None:
        raise ValueError(f"Unit {unit_id!r} not found")

    # Get all descendants for aggregation
    units = await _all_units(db, organisation_id)
    children_map = _build_children_map(units)
    all_desc = _descendants(unit, children_map)
    desc_ids = [u.id for u in all_desc]

    # Aggregate by scope across all descendants
    scope_result = await db.execute(
        select(EmissionRecord.scope, func.sum(EmissionRecord.co2e_kg))
        .join(EmissionSource, EmissionRecord.emission_source_id == EmissionSource.id)
        .where(
            EmissionSource.company_unit_id.in_(desc_ids),
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .group_by(EmissionRecord.scope)
    )
    by_scope: dict[int, float] = {row[0]: float(row[1]) for row in scope_result.all()}
    total_kg = sum(by_scope.values())

    # By question group
    qg_result = await db.execute(
        select(EmissionSource.question_group, func.sum(EmissionRecord.co2e_kg))
        .join(EmissionRecord, EmissionRecord.emission_source_id == EmissionSource.id)
        .where(
            EmissionSource.company_unit_id.in_(desc_ids),
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .group_by(EmissionSource.question_group)
        .order_by(func.sum(EmissionRecord.co2e_kg).desc())
    )
    by_qg = [
        QuestionGroupEntry(
            question_group=row[0],
            co2e_tonnes=_kg_to_tonnes(float(row[1])),
            percentage=_pct(float(row[1]), total_kg),
        )
        for row in qg_result.all()
    ]

    # Top sources
    top_result = await db.execute(
        select(
            EmissionSource.id,
            EmissionSource.activity,
            EmissionSource.question,
            EmissionSource.question_group,
            EmissionRecord.scope,
            func.sum(EmissionRecord.co2e_kg),
        )
        .join(EmissionRecord, EmissionRecord.emission_source_id == EmissionSource.id)
        .where(
            EmissionSource.company_unit_id.in_(desc_ids),
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .group_by(EmissionSource.id, EmissionRecord.scope)
        .order_by(func.sum(EmissionRecord.co2e_kg).desc())
        .limit(10)
    )
    top_sources = [
        TopSource(
            source_id=row[0],
            activity=row[1],
            question=row[2],
            question_group=row[3],
            scope=row[4],
            co2e_tonnes=_kg_to_tonnes(float(row[5])),
            percentage=_pct(float(row[5]), total_kg),
        )
        for row in top_result.all()
    ]

    # Child units summary
    child_units_summary: list[ChildUnitSummary] = []
    for child in sorted(
        children_map.get(unit.company_unit_id, []),
        key=lambda u: u.company_unit_name,
    ):
        child_desc = _descendants(child, children_map)
        child_ids = [u.id for u in child_desc]
        child_kg_result = await db.execute(
            select(func.sum(EmissionRecord.co2e_kg))
            .join(EmissionSource, EmissionRecord.emission_source_id == EmissionSource.id)
            .where(
                EmissionSource.company_unit_id.in_(child_ids),
                EmissionRecord.year == year,
                EmissionRecord.market_factor_type == market_factor_type,
            )
        )
        child_kg = child_kg_result.scalar() or 0.0
        child_units_summary.append(
            ChildUnitSummary(
                id=child.id,
                company_unit_name=child.company_unit_name,
                company_unit_type=child.company_unit_type,
                total_co2e_tonnes=_kg_to_tonnes(float(child_kg)),
            )
        )

    # Site sources (only if unit is a site)
    sources: list[SourceDetail] = []
    if unit.company_unit_type == "site":
        src_result = await db.execute(
            select(EmissionSource)
            .where(EmissionSource.company_unit_id == unit.id)
            .options(selectinload(EmissionSource.records))
        )
        for src in src_result.scalars().all():
            filtered_records = [
                r for r in src.records
                if r.year == year and r.market_factor_type == market_factor_type
            ]
            scopes = sorted({r.scope for r in filtered_records})
            src_kg = sum(r.co2e_kg for r in filtered_records)
            
            # Compute source-level quality: worst quality across all records
            qualities = {r.quality for r in filtered_records if r.quality}
            if "Missing" in qualities:
                source_quality = "Missing"
            elif "Estimated" in qualities:
                source_quality = "Estimated"
            elif "Actual" in qualities:
                source_quality = "Actual"
            else:
                source_quality = None
            
            sources.append(
                SourceDetail(
                    id=src.id,
                    answer_id=src.answer_id,
                    activity=src.activity,
                    question=src.question,
                    question_group=src.question_group,
                    answer_unit=src.answer_unit,
                    co2e_tonnes=_kg_to_tonnes(src_kg),
                    scopes=scopes,
                    quality=source_quality,
                    records=[
                        RecordDetail(
                            id=r.id,
                            year=r.year,
                            month=r.month,
                            scope=r.scope,
                            market_factor_type=r.market_factor_type,
                            value=r.value,
                            co2e_kg=r.co2e_kg,
                            quality=r.quality,
                            upstream=r.upstream,
                            upstream_name=r.upstream_name,
                        )
                        for r in sorted(filtered_records, key=lambda r: (r.year, r.month, r.scope))
                    ],
                )
            )

    return UnitDetailResponse(
        id=unit.id,
        company_unit_id=unit.company_unit_id,
        company_unit_name=unit.company_unit_name,
        company_unit_type=unit.company_unit_type,
        facility_type=unit.facility_type,
        city=unit.city,
        country=unit.country,
        country_code=unit.country_code,
        market_factor_type=market_factor_type,
        total_co2e_tonnes=_kg_to_tonnes(total_kg),
        by_scope=_scope_breakdown(by_scope, total_kg),
        by_question_group=by_qg,
        top_sources=top_sources,
        child_units=child_units_summary,
        sources=sources,
    )


# ── Trends ────────────────────────────────────────────────────────────────────

async def get_trends(
    db: AsyncSession,
    organisation_id: str,
    unit_id: str | None,
    scope: int | None,
    market_factor_type: str,
) -> TrendsResponse:
    org = await _get_org(db, organisation_id)

    if unit_id:
        unit_result = await db.execute(
            select(CompanyUnit).where(
                CompanyUnit.id == unit_id,
                CompanyUnit.organisation_id == organisation_id,
            )
        )
        unit = unit_result.scalar_one_or_none()
        if unit is None:
            raise ValueError(f"Unit {unit_id!r} not found")
        units = await _all_units(db, organisation_id)
        children_map = _build_children_map(units)
        desc_ids = [u.id for u in _descendants(unit, children_map)]
        label = unit.company_unit_name
    else:
        unit_result2 = await db.execute(
            select(CompanyUnit.id).where(CompanyUnit.organisation_id == organisation_id)
        )
        desc_ids = [row[0] for row in unit_result2.all()]
        label = org.company

    filters = [
        EmissionSource.company_unit_id.in_(desc_ids),
        EmissionRecord.market_factor_type == market_factor_type,
    ]
    if scope is not None:
        filters.append(EmissionRecord.scope == scope)

    result = await db.execute(
        select(EmissionRecord.year, func.sum(EmissionRecord.co2e_kg))
        .join(EmissionSource, EmissionRecord.emission_source_id == EmissionSource.id)
        .where(*filters)
        .group_by(EmissionRecord.year)
        .order_by(EmissionRecord.year)
    )
    trends = [
        TrendPoint(year=row[0], co2e_tonnes=_kg_to_tonnes(float(row[1])))
        for row in result.all()
    ]

    return TrendsResponse(
        unit_id=unit_id,
        company_unit_name=label,
        market_factor_type=market_factor_type,
        trends=trends,
    )


# ── Sources list ──────────────────────────────────────────────────────────────

async def get_sources(
    db: AsyncSession,
    organisation_id: str,
    year: int | None,
    scope: int | None,
    question_group: str | None,
    market_factor_type: str,
) -> SourceListResponse:
    if year is None:
        year = await _latest_year(db, organisation_id)
    if year is None:
        year = 2024

    filters = [
        CompanyUnit.organisation_id == organisation_id,
        EmissionRecord.year == year,
        EmissionRecord.market_factor_type == market_factor_type,
    ]
    if scope is not None:
        filters.append(EmissionRecord.scope == scope)
    if question_group:
        filters.append(EmissionSource.question_group == question_group)

    result = await db.execute(
        select(
            EmissionSource.id,
            EmissionSource.answer_id,
            EmissionSource.activity,
            EmissionSource.question,
            EmissionSource.question_group,
            EmissionSource.answer_unit,
            CompanyUnit.id,
            CompanyUnit.company_unit_name,
            CompanyUnit.company_unit_type,
            func.sum(EmissionRecord.co2e_kg),
        )
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .join(EmissionRecord, EmissionRecord.emission_source_id == EmissionSource.id)
        .where(*filters)
        .group_by(EmissionSource.id, CompanyUnit.id)
        .order_by(func.sum(EmissionRecord.co2e_kg).desc())
    )

    rows = result.all()

    # Collect scopes per source
    scope_result = await db.execute(
        select(EmissionSource.id, EmissionRecord.scope)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .join(EmissionRecord, EmissionRecord.emission_source_id == EmissionSource.id)
        .where(
            CompanyUnit.organisation_id == organisation_id,
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .distinct()
    )
    scopes_map: dict[str, set[int]] = defaultdict(set)
    for sid, sc in scope_result.all():
        scopes_map[sid].add(sc)

    sources = [
        SourceSummary(
            id=row[0],
            answer_id=row[1],
            activity=row[2],
            question=row[3],
            question_group=row[4],
            answer_unit=row[5],
            company_unit_id=row[6],
            company_unit_name=row[7],
            company_unit_type=row[8],
            co2e_tonnes=_kg_to_tonnes(float(row[9])),
            scopes=sorted(scopes_map.get(row[0], set())),
        )
        for row in rows
    ]

    return SourceListResponse(sources=sources)


# ── Cascade source-selection ──────────────────────────────────────────────────


async def get_cascade_scopes(
    db: AsyncSession,
    organisation_id: str,
    year: int | None,
    market_factor_type: str,
) -> list[dict]:
    """Return distinct scopes with total co2e and source count."""
    if year is None:
        year = await _latest_year(db, organisation_id)
    if year is None:
        year = 2024

    result = await db.execute(
        select(
            EmissionRecord.scope,
            func.sum(EmissionRecord.co2e_kg).label("total_kg"),
            func.count(EmissionSource.id.distinct()).label("source_count"),
        )
        .join(EmissionSource, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(
            CompanyUnit.organisation_id == organisation_id,
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .group_by(EmissionRecord.scope)
        .order_by(EmissionRecord.scope)
    )
    return [
        {
            "scope": row.scope,
            "co2e_tonnes": _kg_to_tonnes(float(row.total_kg)),
            "source_count": row.source_count,
        }
        for row in result.all()
    ]


async def get_cascade_question_groups(
    db: AsyncSession,
    organisation_id: str,
    scope: int,
    year: int | None,
    market_factor_type: str,
) -> list[dict]:
    """Return distinct question_groups for a scope."""
    if year is None:
        year = await _latest_year(db, organisation_id)
    if year is None:
        year = 2024

    result = await db.execute(
        select(
            EmissionSource.question_group,
            func.sum(EmissionRecord.co2e_kg).label("total_kg"),
            func.count(EmissionSource.id.distinct()).label("source_count"),
        )
        .join(EmissionRecord, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(
            CompanyUnit.organisation_id == organisation_id,
            EmissionRecord.scope == scope,
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .group_by(EmissionSource.question_group)
        .order_by(func.sum(EmissionRecord.co2e_kg).desc())
    )
    return [
        {
            "question_group": row.question_group,
            "co2e_tonnes": _kg_to_tonnes(float(row.total_kg)),
            "source_count": row.source_count,
        }
        for row in result.all()
    ]


async def get_cascade_questions(
    db: AsyncSession,
    organisation_id: str,
    scope: int,
    question_group: str,
    year: int | None,
    market_factor_type: str,
) -> list[dict]:
    """Return distinct questions for a scope + question_group."""
    if year is None:
        year = await _latest_year(db, organisation_id)
    if year is None:
        year = 2024

    result = await db.execute(
        select(
            EmissionSource.question,
            func.sum(EmissionRecord.co2e_kg).label("total_kg"),
            func.count(EmissionSource.id.distinct()).label("source_count"),
        )
        .join(EmissionRecord, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(
            CompanyUnit.organisation_id == organisation_id,
            EmissionRecord.scope == scope,
            EmissionSource.question_group == question_group,
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .group_by(EmissionSource.question)
        .order_by(func.sum(EmissionRecord.co2e_kg).desc())
    )
    return [
        {
            "question": row.question,
            "co2e_tonnes": _kg_to_tonnes(float(row.total_kg)),
            "source_count": row.source_count,
        }
        for row in result.all()
    ]


async def get_cascade_activities(
    db: AsyncSession,
    organisation_id: str,
    scope: int,
    question_group: str,
    question: str,
    year: int | None,
    market_factor_type: str,
) -> list[dict]:
    """Return distinct activities for a scope + question_group + question."""
    if year is None:
        year = await _latest_year(db, organisation_id)
    if year is None:
        year = 2024

    result = await db.execute(
        select(
            EmissionSource.activity,
            func.sum(EmissionRecord.co2e_kg).label("total_kg"),
            func.count(EmissionSource.id.distinct()).label("source_count"),
        )
        .join(EmissionRecord, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(
            CompanyUnit.organisation_id == organisation_id,
            EmissionRecord.scope == scope,
            EmissionSource.question_group == question_group,
            EmissionSource.question == question,
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .group_by(EmissionSource.activity)
        .order_by(func.sum(EmissionRecord.co2e_kg).desc())
    )
    return [
        {
            "activity": row.activity,
            "co2e_tonnes": _kg_to_tonnes(float(row.total_kg)),
            "source_count": row.source_count,
        }
        for row in result.all()
    ]


async def get_cascade_company_units(
    db: AsyncSession,
    organisation_id: str,
    activity: str,
    scope: int,
    question_group: str,
    question: str,
    year: int | None,
    market_factor_type: str,
) -> list[dict]:
    """Return company-unit leaves (one emission_source_id each) for linking."""
    if year is None:
        year = await _latest_year(db, organisation_id)
    if year is None:
        year = 2024

    result = await db.execute(
        select(
            EmissionSource.id.label("emission_source_id"),
            CompanyUnit.id.label("company_unit_id"),
            CompanyUnit.company_unit_name,
            CompanyUnit.company_unit_type,
            func.sum(EmissionRecord.co2e_kg).label("total_kg"),
        )
        .join(EmissionRecord, EmissionRecord.emission_source_id == EmissionSource.id)
        .join(CompanyUnit, EmissionSource.company_unit_id == CompanyUnit.id)
        .where(
            CompanyUnit.organisation_id == organisation_id,
            EmissionRecord.scope == scope,
            EmissionSource.question_group == question_group,
            EmissionSource.question == question,
            EmissionSource.activity == activity,
            EmissionRecord.year == year,
            EmissionRecord.market_factor_type == market_factor_type,
        )
        .group_by(
            EmissionSource.id,
            CompanyUnit.id,
            CompanyUnit.company_unit_name,
            CompanyUnit.company_unit_type,
        )
        .order_by(func.sum(EmissionRecord.co2e_kg).desc())
    )
    return [
        {
            "emission_source_id": row.emission_source_id,
            "company_unit_id": row.company_unit_id,
            "company_unit_name": row.company_unit_name,
            "company_unit_type": row.company_unit_type,
            "co2e_tonnes": _kg_to_tonnes(float(row.total_kg)),
        }
        for row in result.all()
    ]
