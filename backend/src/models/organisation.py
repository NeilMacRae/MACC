"""Organisation and CompanyUnit SQLAlchemy models.

Mirrors the company_construct table from the EcoOnline analytics database.
CompanyUnit uses a self-referential tree via immediate_parent_id to support
variable-depth hierarchies (2–5 levels observed in production data).
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Organisation(Base):
    """Top-level entity representing the customer's company."""

    __tablename__ = "organisations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    root_company_unit_id: Mapped[int | None] = mapped_column(Integer, unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, onupdate=_now
    )

    # Relationships
    company_units: Mapped[list[CompanyUnit]] = relationship(
        "CompanyUnit", back_populates="organisation", cascade="all, delete-orphan"
    )
    context: Mapped[OrganisationalContextRef | None] = relationship(
        "OrganisationalContext", back_populates="organisation", uselist=False
    )
    initiatives: Mapped[list[Any]] = relationship(  # type: ignore[assignment]
        "AbatementInitiative", back_populates="organisation", cascade="all, delete-orphan"
    )
    scenarios: Mapped[list[Any]] = relationship(  # type: ignore[assignment]
        "Scenario", back_populates="organisation", cascade="all, delete-orphan"
    )
    targets: Mapped[list[Any]] = relationship(  # type: ignore[assignment]
        "EmissionTarget", cascade="all, delete-orphan"
    )
    sync_logs: Mapped[list[Any]] = relationship(  # type: ignore[assignment]
        "SyncLog", back_populates="organisation", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Organisation id={self.id!r} company={self.company!r}>"


# Forward-reference alias used inside Organisation for the type checker
OrganisationalContextRef = "OrganisationalContext"  # type: ignore[assignment]
Any = object  # type: ignore[assignment] # noqa: A001


class CompanyUnit(Base):
    """A node in the organisational hierarchy tree.

    Mirrors the company_construct table. Units are either 'division'
    (organisational grouping) or 'site' (physical location / leaf node).
    Parent relationship is via immediate_parent_id → company_unit_id (the
    EcoOnline integer ID, not the internal UUID).
    """

    __tablename__ = "company_units"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False
    )
    company_unit_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    company_unit_name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_unit_type: Mapped[str] = mapped_column(String(20), nullable=False)
    immediate_parent_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    immediate_parent_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    facility_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    continent: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    level_1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    level_2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    level_3: Mapped[str | None] = mapped_column(String(255), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    financial_year_start_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    financial_year_start_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    open_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, onupdate=_now
    )

    # Relationships
    organisation: Mapped[Organisation] = relationship("Organisation", back_populates="company_units")
    emission_sources: Mapped[list[Any]] = relationship(  # type: ignore[assignment]
        "EmissionSource", back_populates="company_unit", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_company_units_organisation_id", "organisation_id"),
        Index("ix_company_units_immediate_parent_id", "immediate_parent_id"),
        Index("ix_company_units_type", "company_unit_type"),
        Index("ix_company_units_country_code", "country_code"),
    )

    def __repr__(self) -> str:
        return (
            f"<CompanyUnit id={self.id!r} name={self.company_unit_name!r}"
            f" type={self.company_unit_type!r}>"
        )
