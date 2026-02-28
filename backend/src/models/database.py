"""SQLAlchemy async engine and session factory.

Configures SQLite with WAL mode, foreign keys, and busy_timeout for safe
concurrent access in a single-tenant local-dev environment.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = "sqlite+aiosqlite:///./macc.db"


class Base(DeclarativeBase):
    """Shared declarative base for all SQLAlchemy models."""

    pass


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragmas(dbapi_conn: Any, _connection_record: Any) -> None:  # noqa: ANN401
    """Enable WAL mode, FK enforcement, and set a generous busy timeout."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA cache_size=-64000")  # 64 MB
    cursor.close()


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
