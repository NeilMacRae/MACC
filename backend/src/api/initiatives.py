"""FastAPI router for abatement initiatives.

Routes (all under /initiatives, mounted with prefix=/api/v1 in main.py):
    POST   /                   create
    GET    /                   list (filterable, paginated)
    GET    /{initiative_id}    detail
    PUT    /{initiative_id}    update
    DELETE /{initiative_id}    delete
    PATCH  /{initiative_id}/status   status transition
    GET    /{initiative_id}/overlap  overlap check
    POST   /bulk-validate            bulk feasibility check
    GET    /macc                     MACC chart data
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_organisation, get_db
from src.models.organisation import Organisation
from src.schemas.initiatives import (
    BulkValidateRequest,
    BulkValidateResponse,
    InitiativeCreate,
    InitiativeListResponse,
    InitiativeResponse,
    InitiativeUpdate,
    OverlapResponse,
    StatusUpdate,
)
from src.services import initiative_service, macc_calculator

router = APIRouter(prefix="/initiatives", tags=["initiatives"])


# ---------------------------------------------------------------------------
# Dependency aliases
# ---------------------------------------------------------------------------

OrgDep = Annotated[Organisation, Depends(get_current_organisation)]
DbDep = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


@router.post("", status_code=status.HTTP_201_CREATED, response_model=InitiativeResponse)
async def create_initiative(
    payload: InitiativeCreate,
    org: OrgDep,
    db: DbDep,
) -> InitiativeResponse:
    """Create a new abatement initiative."""
    return await initiative_service.create_initiative(db, org.id, payload)


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


@router.get("", response_model=InitiativeListResponse)
async def list_initiatives(
    org: OrgDep,
    db: DbDep,
    status_filter: str | None = Query(None, alias="status"),
    initiative_type: str | None = Query(None),
    scope: int | None = Query(None),
    sort_by: str = Query("cost_per_tonne"),
    sort_order: str = Query("asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> InitiativeListResponse:
    """List all initiatives with optional filtering and pagination."""
    statuses: list[str] | None = None
    if status_filter:
        statuses = [s.strip() for s in status_filter.split(",") if s.strip()]

    return await initiative_service.list_initiatives(
        db,
        org.id,
        statuses=statuses,
        initiative_type=initiative_type,
        scope=scope,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------------------
# MACC chart data
# ---------------------------------------------------------------------------


@router.get("/macc")
async def get_macc_data(
    org: OrgDep,
    db: DbDep,
    status_filter: str | None = Query(None, alias="status"),
    initiative_type: str | None = Query(None),
) -> dict:
    """Return pre-computed MACC bar geometry and summary statistics."""
    statuses: list[str] | None = None
    if status_filter:
        statuses = [s.strip() for s in status_filter.split(",") if s.strip()]

    return await macc_calculator.compute_macc(
        db,
        org.id,
        statuses=statuses,
        initiative_type=initiative_type,
    )


# ---------------------------------------------------------------------------
# Bulk validate
# ---------------------------------------------------------------------------


@router.post("/bulk-validate", response_model=BulkValidateResponse)
async def bulk_validate(
    payload: BulkValidateRequest,
    org: OrgDep,
    db: DbDep,
) -> BulkValidateResponse:
    """Validate a set of initiatives for feasibility."""
    return await initiative_service.bulk_validate(db, org.id, payload.initiative_ids)


# ---------------------------------------------------------------------------
# Detail
# ---------------------------------------------------------------------------


@router.get("/{initiative_id}", response_model=InitiativeResponse)
async def get_initiative(
    initiative_id: str,
    org: OrgDep,
    db: DbDep,
) -> InitiativeResponse:
    """Retrieve full initiative detail."""
    return await initiative_service.get_initiative(db, org.id, initiative_id)


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


@router.put("/{initiative_id}", response_model=InitiativeResponse)
async def update_initiative(
    initiative_id: str,
    payload: InitiativeUpdate,
    org: OrgDep,
    db: DbDep,
) -> InitiativeResponse:
    """Update an existing initiative."""
    return await initiative_service.update_initiative(db, org.id, initiative_id, payload)


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


@router.delete("/{initiative_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_initiative(
    initiative_id: str,
    org: OrgDep,
    db: DbDep,
) -> None:
    """Delete an initiative.  Raises 409 if status is 'in_progress'."""
    await initiative_service.delete_initiative(db, org.id, initiative_id)


# ---------------------------------------------------------------------------
# Status transition
# ---------------------------------------------------------------------------


@router.patch("/{initiative_id}/status", response_model=InitiativeResponse)
async def update_status(
    initiative_id: str,
    payload: StatusUpdate,
    org: OrgDep,
    db: DbDep,
) -> InitiativeResponse:
    """Transition initiative status."""
    return await initiative_service.update_status(db, org.id, initiative_id, payload)


# ---------------------------------------------------------------------------
# Overlap
# ---------------------------------------------------------------------------


@router.get("/{initiative_id}/overlap", response_model=OverlapResponse)
async def get_overlap(
    initiative_id: str,
    org: OrgDep,
    db: DbDep,
) -> OverlapResponse:
    """Check for emission source overlap with other initiatives."""
    return await initiative_service.get_overlap(db, org.id, initiative_id)
