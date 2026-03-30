"""Shared pytest fixtures for MACC backend test suite.

Provides a fresh in-memory async SQLite database per test function, a
session fixture, and a bare Organisation fixture (no OrganisationalContext)
used in unit tests.

Each test gets its own engine + schema so service-level commit/rollback calls
never conflict with fixture teardown.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Import all models so they register with Base before create_all
from src.models.database import Base
from src.models import context  # noqa: F401 — registers OrganisationalContext, EmissionTarget
from src.models import organisation  # noqa: F401 — registers Organisation, CompanyUnit
from src.models import emissions  # noqa: F401 — registers EmissionRecord, EmissionSource
from src.models import initiative  # noqa: F401 — registers AbatementInitiative
from src.models import scenario  # noqa: F401 — registers Scenario, ScenarioInitiative
from src.models import sync  # noqa: F401 — registers SyncLog
from src.models.organisation import Organisation


# ---------------------------------------------------------------------------
# Engine + schema — fresh per test function
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def engine():
    """Create a fresh in-memory SQLite engine with all tables for each test."""
    # Each test gets its own :memory: database — no shared state between tests.
    eng = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


# ---------------------------------------------------------------------------
# Session — one per test, bound to the per-test engine
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db(engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide an AsyncSession bound to the per-test in-memory database."""
    async_session = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )
    async with async_session() as session:
        yield session


# ---------------------------------------------------------------------------
# Organisation fixture — NO context record created
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def org(db: AsyncSession) -> Organisation:
    """A bare Organisation with no OrganisationalContext attached."""
    o = Organisation(
        id=str(uuid.uuid4()),
        # Use a unique name to avoid any residual unique-constraint issues
        company=f"Test Corp {uuid.uuid4().hex[:8]}",
    )
    db.add(o)
    await db.commit()
    await db.refresh(o)
    return o
