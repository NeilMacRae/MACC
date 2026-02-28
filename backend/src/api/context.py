"""FastAPI router for organisational context and emission targets.

Routes (all mounted with prefix=/api/v1 in main.py):
    GET    /context                              get org context
    PUT    /context                              upsert org context
    GET    /context/targets                      list targets
    POST   /context/targets                      create target
    PUT    /context/targets/{target_id}          update target
    DELETE /context/targets/{target_id}          delete target
    GET    /context/targets/{target_id}/progress get target progress
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_organisation, get_db
from src.models.context import OrganisationalContext
from src.models.organisation import Organisation
from src.schemas.context import (
    ContextResponse,
    ContextUpsert,
    TargetCreate,
    TargetListResponse,
    TargetProgressResponse,
    TargetResponse,
    TargetUpdate,
)
from src.services import target_service

router = APIRouter(prefix="/context", tags=["context"])

# ---------------------------------------------------------------------------
# Dependency aliases
# ---------------------------------------------------------------------------

OrgDep = Annotated[Organisation, Depends(get_current_organisation)]
DbDep = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# Context — GET / PUT (upsert)
# ---------------------------------------------------------------------------


@router.get("", response_model=ContextResponse)
async def get_context(org: OrgDep, db: DbDep) -> ContextResponse:
    """Retrieve the organisational context profile."""
    from sqlalchemy import select

    result = await db.execute(
        select(OrganisationalContext).where(
            OrganisationalContext.organisation_id == org.id
        )
    )
    ctx = result.scalar_one_or_none()
    if ctx is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="No context configured yet")
    return ContextResponse.model_validate(ctx)


@router.put("", response_model=ContextResponse)
async def upsert_context(
    payload: ContextUpsert,
    org: OrgDep,
    db: DbDep,
) -> ContextResponse:
    """Create or update the organisational context (upsert)."""
    from sqlalchemy import select

    result = await db.execute(
        select(OrganisationalContext).where(
            OrganisationalContext.organisation_id == org.id
        )
    )
    ctx = result.scalar_one_or_none()

    if ctx is None:
        import uuid
        from datetime import datetime

        ctx = OrganisationalContext(
            id=str(uuid.uuid4()),
            organisation_id=org.id,
        )
        db.add(ctx)

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(ctx, field, val)
    ctx.updated_at = __import__("datetime").datetime.utcnow()

    await db.commit()
    await db.refresh(ctx)
    return ContextResponse.model_validate(ctx)


# ---------------------------------------------------------------------------
# Targets
# ---------------------------------------------------------------------------


@router.get("/targets", response_model=TargetListResponse)
async def list_targets(org: OrgDep, db: DbDep) -> TargetListResponse:
    """List all emission reduction targets."""
    return await target_service.list_targets(db, org.id)


@router.post(
    "/targets",
    status_code=status.HTTP_201_CREATED,
    response_model=TargetResponse,
)
async def create_target(
    payload: TargetCreate,
    org: OrgDep,
    db: DbDep,
) -> TargetResponse:
    """Create a new emission reduction target."""
    return await target_service.create_target(db, org.id, payload)


@router.put("/targets/{target_id}", response_model=TargetResponse)
async def update_target(
    target_id: str,
    payload: TargetUpdate,
    org: OrgDep,
    db: DbDep,
) -> TargetResponse:
    """Update an emission reduction target."""
    return await target_service.update_target(db, org.id, target_id, payload)


@router.delete("/targets/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_target(
    target_id: str,
    org: OrgDep,
    db: DbDep,
) -> None:
    """Delete an emission reduction target."""
    await target_service.delete_target(db, org.id, target_id)


@router.get("/targets/{target_id}/progress", response_model=TargetProgressResponse)
async def get_target_progress(
    target_id: str,
    org: OrgDep,
    db: DbDep,
    scenario_id: str | None = Query(None),
) -> TargetProgressResponse:
    """Get progress toward a target, evaluated against a scenario."""
    return await target_service.get_target_progress(
        db, org.id, target_id, scenario_id
    )
