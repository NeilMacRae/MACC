"""Unit tests for target_service — T005.

ALL tests must pass WITHOUT an OrganisationalContext record existing.
This verifies FR-015: Targets tab is always functional regardless of
whether an org context has been configured.

Tests cover:
  - list_targets: returns empty list when no targets exist
  - create_target: creates a target linked to org (not context)
  - update_target: updates fields; recalculates target_co2e_tonnes
  - delete_target: removes the target
  - get_target_progress: returns progress metrics without a context record
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.organisation import Organisation
from src.schemas.context import TargetCreate, TargetUpdate
from src.services import target_service


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _base_create() -> TargetCreate:
    return TargetCreate(
        target_year=2030,
        target_type="absolute",
        target_value_pct=50.0,
        baseline_year=2020,
        baseline_co2e_tonnes=1000.0,
        scope_coverage=[1, 2],
        source="SBTi",
        notes="Test target",
    )


# ---------------------------------------------------------------------------
# list_targets
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_targets_empty_without_context(db: AsyncSession, org: Organisation) -> None:
    """list_targets returns an empty list when no targets exist and no context record exists."""
    result = await target_service.list_targets(db, org.id)
    assert result.total == 0
    assert result.items == []


@pytest.mark.asyncio
async def test_list_targets_returns_created_targets_without_context(
    db: AsyncSession, org: Organisation
) -> None:
    """list_targets returns created targets even when no context record exists."""
    payload = _base_create()
    await target_service.create_target(db, org.id, payload)

    result = await target_service.list_targets(db, org.id)
    assert result.total == 1
    assert result.items[0].organisation_id == org.id
    assert result.items[0].target_year == 2030


# ---------------------------------------------------------------------------
# create_target
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_target_without_context(db: AsyncSession, org: Organisation) -> None:
    """create_target succeeds and links target directly to org, not context."""
    payload = _base_create()
    response = await target_service.create_target(db, org.id, payload)

    assert response.id is not None
    assert response.organisation_id == org.id
    assert response.target_year == 2030
    assert response.target_type == "absolute"
    assert response.target_value_pct == 50.0
    assert response.baseline_year == 2020
    assert response.baseline_co2e_tonnes == 1000.0
    assert response.source == "SBTi"
    assert response.notes == "Test target"
    assert response.scope_coverage == [1, 2]


@pytest.mark.asyncio
async def test_create_target_computes_target_co2e_tonnes(
    db: AsyncSession, org: Organisation
) -> None:
    """create_target auto-computes target_co2e_tonnes from baseline * (1 - pct/100)."""
    payload = TargetCreate(
        target_year=2035,
        target_type="absolute",
        target_value_pct=40.0,
        baseline_year=2020,
        baseline_co2e_tonnes=500.0,
    )
    response = await target_service.create_target(db, org.id, payload)
    # 500 * (1 - 40/100) = 300.0
    assert response.target_co2e_tonnes == pytest.approx(300.0, abs=0.01)


@pytest.mark.asyncio
async def test_create_target_rejects_target_year_not_after_baseline(
    db: AsyncSession, org: Organisation
) -> None:
    """create_target raises 422 when target_year <= baseline_year."""
    from fastapi import HTTPException

    payload = TargetCreate(
        target_year=2020,
        target_type="absolute",
        target_value_pct=50.0,
        baseline_year=2020,
        baseline_co2e_tonnes=1000.0,
    )
    with pytest.raises(HTTPException) as exc_info:
        await target_service.create_target(db, org.id, payload)
    assert exc_info.value.status_code == 422


# ---------------------------------------------------------------------------
# update_target
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_target_without_context(db: AsyncSession, org: Organisation) -> None:
    """update_target modifies the target without requiring a context record."""
    created = await target_service.create_target(db, org.id, _base_create())

    update = TargetUpdate(target_value_pct=75.0, notes="Updated note")
    updated = await target_service.update_target(db, org.id, created.id, update)

    assert updated.id == created.id
    assert updated.target_value_pct == 75.0
    assert updated.notes == "Updated note"


@pytest.mark.asyncio
async def test_update_target_recomputes_co2e_when_baseline_changes(
    db: AsyncSession, org: Organisation
) -> None:
    """update_target recalculates target_co2e_tonnes when baseline changes."""
    created = await target_service.create_target(db, org.id, _base_create())

    update = TargetUpdate(baseline_co2e_tonnes=2000.0)
    updated = await target_service.update_target(db, org.id, created.id, update)

    # 2000 * (1 - 50/100) = 1000.0
    assert updated.target_co2e_tonnes == pytest.approx(1000.0, abs=0.01)


# ---------------------------------------------------------------------------
# delete_target
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_target_without_context(db: AsyncSession, org: Organisation) -> None:
    """delete_target removes the record without requiring a context record."""
    created = await target_service.create_target(db, org.id, _base_create())

    await target_service.delete_target(db, org.id, created.id)

    # After deletion, list should be empty
    result = await target_service.list_targets(db, org.id)
    assert result.total == 0


@pytest.mark.asyncio
async def test_delete_target_raises_404_for_unknown_id(
    db: AsyncSession, org: Organisation
) -> None:
    """delete_target raises 404 when target ID does not exist."""
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await target_service.delete_target(db, org.id, "nonexistent-id")
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# get_target_progress
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_target_progress_without_context(
    db: AsyncSession, org: Organisation
) -> None:
    """get_target_progress returns valid progress metrics without a context record.

    With no emission data, current_co2e_tonnes is 0; with no scenario,
    scenario_reduction is 0; on_track is True (0 gap when both are 0).
    """
    created = await target_service.create_target(db, org.id, _base_create())

    progress = await target_service.get_target_progress(db, org.id, created.id)

    assert progress.target.id == created.id
    assert progress.target.organisation_id == org.id
    assert progress.current_co2e_tonnes == 0.0
    assert progress.scenario_reduction_co2e_tonnes == 0.0
    assert progress.projected_co2e_tonnes == 0.0
    assert progress.years_remaining is not None


@pytest.mark.asyncio
async def test_get_target_progress_raises_404_for_unknown_target(
    db: AsyncSession, org: Organisation
) -> None:
    """get_target_progress raises 404 for unknown target IDs."""
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await target_service.get_target_progress(db, org.id, "no-such-target")
    assert exc_info.value.status_code == 404
