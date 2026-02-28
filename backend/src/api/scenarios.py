"""FastAPI router for scenario endpoints.

Routes (all mounted with prefix=/api/v1 in main.py):
    POST   /scenarios                                   create
    GET    /scenarios                                   list
    GET    /scenarios/compare                           compare (must be before /{id})
    GET    /scenarios/{scenario_id}                     detail
    PUT    /scenarios/{scenario_id}                     update
    DELETE /scenarios/{scenario_id}                     delete
    POST   /scenarios/{scenario_id}/initiatives         add initiatives
    DELETE /scenarios/{scenario_id}/initiatives/{init}  remove initiative
    PATCH  /scenarios/{scenario_id}/initiatives/reorder reorder
    GET    /scenarios/{scenario_id}/macc-data           MACC chart data
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_organisation, get_db
from src.models.organisation import Organisation
from src.schemas.scenarios import (
    AddInitiativesRequest,
    CompareResponse,
    ReorderRequest,
    ScenarioCreate,
    ScenarioDetailResponse,
    ScenarioListResponse,
    ScenarioMACCDataResponse,
    ScenarioResponse,
    ScenarioUpdate,
)
from src.services import scenario_service

router = APIRouter(prefix="/scenarios", tags=["scenarios"])

# ---------------------------------------------------------------------------
# Dependency aliases
# ---------------------------------------------------------------------------

OrgDep = Annotated[Organisation, Depends(get_current_organisation)]
DbDep = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# Scenario CRUD
# ---------------------------------------------------------------------------


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ScenarioResponse)
async def create_scenario(
    payload: ScenarioCreate,
    org: OrgDep,
    db: DbDep,
) -> ScenarioResponse:
    """Create a new scenario."""
    return await scenario_service.create_scenario(db, org.id, payload)


@router.get("", response_model=ScenarioListResponse)
async def list_scenarios(org: OrgDep, db: DbDep) -> ScenarioListResponse:
    """List all scenarios with summary metrics."""
    return await scenario_service.list_scenarios(db, org.id)


# NOTE: /compare must be declared BEFORE /{scenario_id} to avoid routing conflicts.
@router.get("/compare", response_model=CompareResponse)
async def compare_scenarios(
    org: OrgDep,
    db: DbDep,
    scenario_ids: str = Query(..., description="Comma-separated scenario UUIDs (2-5)"),
) -> CompareResponse:
    """Compare two or more scenarios side-by-side."""
    ids = [s.strip() for s in scenario_ids.split(",") if s.strip()]
    return await scenario_service.compare_scenarios(db, org.id, ids)


@router.get("/{scenario_id}", response_model=ScenarioDetailResponse)
async def get_scenario(
    scenario_id: str,
    org: OrgDep,
    db: DbDep,
) -> ScenarioDetailResponse:
    """Get full scenario detail including all initiatives and target alignment."""
    return await scenario_service.get_scenario(db, org.id, scenario_id)


@router.put("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: str,
    payload: ScenarioUpdate,
    org: OrgDep,
    db: DbDep,
) -> ScenarioResponse:
    """Update scenario metadata."""
    return await scenario_service.update_scenario(db, org.id, scenario_id, payload)


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scenario(
    scenario_id: str,
    org: OrgDep,
    db: DbDep,
) -> None:
    """Delete a scenario (does not delete its initiatives)."""
    await scenario_service.delete_scenario(db, org.id, scenario_id)


# ---------------------------------------------------------------------------
# Initiative management within a scenario
# ---------------------------------------------------------------------------


@router.post("/{scenario_id}/initiatives", response_model=ScenarioDetailResponse)
async def add_initiatives(
    scenario_id: str,
    payload: AddInitiativesRequest,
    org: OrgDep,
    db: DbDep,
) -> ScenarioDetailResponse:
    """Add initiatives to a scenario."""
    return await scenario_service.add_initiatives(db, org.id, scenario_id, payload)


@router.delete(
    "/{scenario_id}/initiatives/{initiative_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_initiative(
    scenario_id: str,
    initiative_id: str,
    org: OrgDep,
    db: DbDep,
) -> None:
    """Remove an initiative from a scenario."""
    await scenario_service.remove_initiative(db, org.id, scenario_id, initiative_id)


@router.patch("/{scenario_id}/initiatives/reorder", response_model=ScenarioDetailResponse)
async def reorder_initiatives(
    scenario_id: str,
    payload: ReorderRequest,
    org: OrgDep,
    db: DbDep,
) -> ScenarioDetailResponse:
    """Reorder initiatives within a scenario."""
    return await scenario_service.reorder_initiatives(db, org.id, scenario_id, payload)


# ---------------------------------------------------------------------------
# MACC data
# ---------------------------------------------------------------------------


@router.get("/{scenario_id}/macc-data", response_model=ScenarioMACCDataResponse)
async def get_macc_data(
    scenario_id: str,
    org: OrgDep,
    db: DbDep,
) -> ScenarioMACCDataResponse:
    """Get pre-computed MACC chart data for the scenario."""
    return await scenario_service.get_macc_data(db, org.id, scenario_id)
