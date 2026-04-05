"""Shared pytest fixtures for MACC backend test suite.

Provides a PostgreSQL-backed async database per test function using
TEST_DATABASE_URL (defaults to the docker-compose test-db service).

Each test runs in a transaction that is rolled back on teardown, so tests
are fully isolated without needing to drop/recreate schema each time.
"""

from __future__ import annotations

import os
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

# Import all models so they register with Base before create_all
from src.models.database import Base
from src.models import context  # noqa: F401 — registers OrganisationalContext, EmissionTarget
from src.models import organisation  # noqa: F401 — registers Organisation, CompanyUnit
from src.models import emissions  # noqa: F401 — registers EmissionRecord, EmissionSource
from src.models import initiative  # noqa: F401 — registers AbatementInitiative
from src.models import scenario  # noqa: F401 — registers Scenario, ScenarioInitiative
from src.models import sync  # noqa: F401 — registers SyncLog
from src.models.organisation import Organisation

_TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://macc:macc@localhost:5433/macc_test",
)


# ---------------------------------------------------------------------------
# Session-scoped engine — shared across all tests; schema created once
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="session")
async def engine() -> AsyncGenerator[AsyncEngine, None]:
    """Create the schema once per test session against the PostgreSQL test-db."""
    eng = create_async_engine(_TEST_DATABASE_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


# ---------------------------------------------------------------------------
# Per-test session with transaction rollback for isolation
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db(engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """Provide an AsyncSession that rolls back after each test."""
    async with engine.connect() as conn:
        await conn.begin()
        async_session = async_sessionmaker(
            bind=conn,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
        async with async_session() as session:
            yield session
        await conn.rollback()


# ---------------------------------------------------------------------------
# Organisation fixture — NO context record created
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def org(db: AsyncSession) -> Organisation:
    """A bare Organisation with no OrganisationalContext attached."""
    o = Organisation(
        id=str(uuid.uuid4()),
        company=f"Test Corp {uuid.uuid4().hex[:8]}",
    )
    db.add(o)
    await db.commit()
    await db.refresh(o)
    return o
