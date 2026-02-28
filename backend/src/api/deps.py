"""FastAPI dependency injection: DB session and current organisation."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.api.auth import decode_token, extract_bearer_token
from src.models.database import get_db
from src.models.organisation import Organisation


async def get_current_organisation(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Organisation:
    """Validate JWT and return the Organisation for the requesting party.

    Raises 401 if the token is missing/invalid, 404 if the organisation
    referenced in the token no longer exists in the DB.
    """
    from fastapi import HTTPException, status

    token = extract_bearer_token(request)
    payload = decode_token(token)
    org_id: str | None = payload.get("org")  # type: ignore[assignment]
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing organisation claim",
        )
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organisation {org_id!r} not found",
        )
    return org


# Re-export get_db as a named dependency for convenience
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db():
        yield session
