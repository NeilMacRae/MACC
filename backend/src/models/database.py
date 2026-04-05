"""SQLAlchemy async engine and session factory.

Requires DATABASE_URL environment variable (postgresql+asyncpg:// or postgres://).
"""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

_raw_url = os.getenv("DATABASE_URL")
if not _raw_url:
    raise RuntimeError("DATABASE_URL environment variable is required")

# Railway Postgres URLs use the postgres:// scheme; SQLAlchemy requires postgresql+asyncpg://
if _raw_url.startswith("postgres://"):
    _raw_url = _raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _raw_url.startswith("postgresql://") and "+" not in _raw_url:
    _raw_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

DATABASE_URL: str = _raw_url


class Base(DeclarativeBase):
    """Shared declarative base for all SQLAlchemy models."""

    pass


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
)


# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # prevent implicit lazy-loads in async context
    autoflush=False,
    autocommit=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async session and close it when the request finishes."""
    async with AsyncSessionLocal() as session:
        yield session


async def create_all(conn: AsyncConnection) -> None:
    """Create all tables (used in tests; production uses Alembic)."""
    await conn.run_sync(Base.metadata.create_all)


async def drop_all(conn: AsyncConnection) -> None:
    """Drop all tables (used in tests)."""
    await conn.run_sync(Base.metadata.drop_all)


async def init_db() -> None:
    """Initialise DB (create tables). Only used for tests without Alembic."""
    async with engine.begin() as conn:
        await create_all(conn)


# Convenience alias used by the FastAPI dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yields an async DB session."""
    async for session in get_session():
        yield session


# One-liner for running raw SQL in tests
async def execute_raw(sql: str) -> None:
    async with engine.begin() as conn:
        await conn.execute(text(sql))
