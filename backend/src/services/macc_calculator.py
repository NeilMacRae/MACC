"""MACC calculator service.

Produces the data needed to render a Marginal Abatement Cost Curve:

- Initiatives sorted by cost_per_tonne ascending (cheapest first, i.e.
  negative-cost bars appear to the left).
- x-positions are cumulative co2e_reduction_annual_tonnes widths so bars
  tile horizontally.
- Negative-cost bars (cost_per_tonne < 0) render below the x-axis.
- Summary statistics: total_capex_gbp, total_co2e_reduction_annual_tonnes,
  weighted_avg_cost_per_tonne.

Consumers (frontend) receive the pre-computed bar geometry and can render
the SVG directly without additional sorting or accumulation logic.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.initiative import AbatementInitiative, InitiativeEmissionSource


# ---------------------------------------------------------------------------
# Output types (returned as plain dicts for easy JSON serialisation)
# ---------------------------------------------------------------------------


@dataclass
class MACCBar:
    """Geometry and metadata for a single MACC bar."""

    initiative_id: str
    name: str
    status: str
    initiative_type: str
    confidence: str | None
    owner: str | None
    capex_gbp: float
    co2e_reduction_annual_tonnes: float
    cost_per_tonne: float
    opex_annual_gbp: float | None
    # MACC geometry
    x_start: float           # cumulative start position on abatement axis
    x_end: float             # cumulative end position (x_start + co2e_reduction_annual_tonnes)
    bar_width: float         # = co2e_reduction_annual_tonnes
    bar_height: float        # = abs(cost_per_tonne)
    is_negative_cost: bool   # cost_per_tonne < 0


@dataclass
class MACCSummary:
    """Aggregate statistics for the whole curve."""

    total_capex_gbp: float
    total_co2e_reduction_annual_tonnes: float
    weighted_avg_cost_per_tonne: float
    bar_count: int
    negative_cost_count: int        # bars below x-axis (cost-saving)
    positive_cost_count: int        # bars above x-axis (net cost)
    max_abatement_potential: float  # rightmost x position


def _weighted_avg(bars: list[MACCBar]) -> float:
    """Reduction-weighted average cost per tonne."""
    total_reduction = sum(b.co2e_reduction_annual_tonnes for b in bars)
    if total_reduction <= 0:
        return 0.0
    weighted_sum = sum(b.cost_per_tonne * b.co2e_reduction_annual_tonnes for b in bars)
    return round(weighted_sum / total_reduction, 4)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def compute_macc(
    db: AsyncSession,
    org_id: str,
    statuses: list[str] | None = None,
    initiative_type: str | None = None,
) -> dict[str, Any]:
    """Return MACC bar data and summary statistics.

    Bars are sorted cheapest-first (ascending cost_per_tonne).  Cumulative
    x-positions are computed so each bar's left edge is the sum of all
    previous bars' widths.

    Parameters
    ----------
    statuses:
        Optional whitelist of initiative statuses to include.  Defaults to
        all non-rejected statuses (idea, planned, approved, in_progress,
        completed).
    initiative_type:
        Optional filter: "custom" or "ai_suggested".
    """
    if statuses is None:
        statuses = ["idea", "planned", "approved", "in_progress", "completed"]

    stmt = (
        select(AbatementInitiative)
        .where(
            AbatementInitiative.organisation_id == org_id,
            AbatementInitiative.status.in_(statuses),
        )
        .options(selectinload(AbatementInitiative.emission_source_links))
    )
    if initiative_type:
        stmt = stmt.where(AbatementInitiative.initiative_type == initiative_type)

    result = await db.execute(stmt)
    rows = result.scalars().all()

    # Sort cheapest-first (negative costs appear leftmost)
    rows_sorted = sorted(rows, key=lambda r: r.cost_per_tonne)

    bars: list[MACCBar] = []
    cumulative_x: float = 0.0

    for row in rows_sorted:
        width = row.co2e_reduction_annual_tonnes
        bars.append(
            MACCBar(
                initiative_id=row.id,
                name=row.name,
                status=row.status,
                initiative_type=row.initiative_type,
                confidence=row.confidence,
                owner=row.owner,
                capex_gbp=row.capex_gbp,
                co2e_reduction_annual_tonnes=width,
                cost_per_tonne=row.cost_per_tonne,
                opex_annual_gbp=row.opex_annual_gbp,
                x_start=round(cumulative_x, 4),
                x_end=round(cumulative_x + width, 4),
                bar_width=round(width, 4),
                bar_height=round(abs(row.cost_per_tonne), 4),
                is_negative_cost=row.cost_per_tonne < 0,
            )
        )
        cumulative_x += width

    summary = MACCSummary(
        total_capex_gbp=round(sum(b.capex_gbp for b in bars), 2),
        total_co2e_reduction_annual_tonnes=round(sum(b.co2e_reduction_annual_tonnes for b in bars), 4),
        weighted_avg_cost_per_tonne=_weighted_avg(bars),
        bar_count=len(bars),
        negative_cost_count=sum(1 for b in bars if b.is_negative_cost),
        positive_cost_count=sum(1 for b in bars if not b.is_negative_cost),
        max_abatement_potential=round(cumulative_x, 4),
    )

    return {
        "bars": [
            {
                "initiative_id": b.initiative_id,
                "name": b.name,
                "status": b.status,
                "initiative_type": b.initiative_type,
                "confidence": b.confidence,
                "owner": b.owner,
                "capex_gbp": b.capex_gbp,
                "co2e_reduction_annual_tonnes": b.co2e_reduction_annual_tonnes,
                "cost_per_tonne": b.cost_per_tonne,
                "opex_annual_gbp": b.opex_annual_gbp,
                "x_start": b.x_start,
                "x_end": b.x_end,
                "bar_width": b.bar_width,
                "bar_height": b.bar_height,
                "is_negative_cost": b.is_negative_cost,
            }
            for b in bars
        ],
        "summary": {
            "total_capex_gbp": summary.total_capex_gbp,
            "total_co2e_reduction_annual_tonnes": summary.total_co2e_reduction_annual_tonnes,
            "weighted_avg_cost_per_tonne": summary.weighted_avg_cost_per_tonne,
            "bar_count": summary.bar_count,
            "negative_cost_count": summary.negative_cost_count,
            "positive_cost_count": summary.positive_cost_count,
            "max_abatement_potential": summary.max_abatement_potential,
        },
    }
