"""EmissionSource and EmissionRecord SQLAlchemy models.

EmissionSource maps to a unique answer_id from the EcoOnline answers_construct
analytics table.  EmissionRecord stores monthly granularity with scope,
market_factor_type (Location/Market), and upstream classification.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


class EmissionSource(Base):
    """A specific emissions measurement series at a company unit.

    Keyed by answer_id (stable EcoOnline identifier).
    Taxonomy: question_group → question → activity.
    """

    __tablename__ = "emission_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_unit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("company_units.id", ondelete="CASCADE"), nullable=False
    )
    answer_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    activity: Mapped[str] = mapped_column(String(255), nullable=False)
    question: Mapped[str] = mapped_column(String(255), nullable=False)
    question_group: Mapped[str] = mapped_column(String(255), nullable=False)
    answer_unit: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, onupdate=_now
    )

    # Relationships
    company_unit: Mapped[object] = relationship("CompanyUnit", back_populates="emission_sources")
    records: Mapped[list[EmissionRecord]] = relationship(
        "EmissionRecord", back_populates="source", cascade="all, delete-orphan"
    )
    initiative_links: Mapped[list[object]] = relationship(
        "InitiativeEmissionSource", back_populates="emission_source"
    )

    __table_args__ = (
        Index("ix_emission_sources_company_unit_id", "company_unit_id"),
        # answer_id unique index is implicit from unique=True
    )

    def __repr__(self) -> str:
        return f"<EmissionSource id={self.id!r} answer_id={self.answer_id!r} activity={self.activity!r}>"


class EmissionRecord(Base):
    """A single monthly emissions data point for a source.

    Stores both Location and Market factor types.  A single EmissionSource
    can generate multiple records per month (e.g., Scope 2 + Scope 3 T&D
    for the same answer_id) and for both market_factor_type values.
    """

    __tablename__ = "emission_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    emission_source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("emission_sources.id", ondelete="CASCADE"), nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    scope: Mapped[int] = mapped_column(Integer, nullable=False)
    market_factor_type: Mapped[str] = mapped_column(String(20), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    co2e_kg: Mapped[float] = mapped_column(Float, nullable=False)
    quality: Mapped[str | None] = mapped_column(String(20), nullable=True)
    upstream: Mapped[str] = mapped_column(String(50), nullable=False, default="Regular")
    upstream_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)

    # Relationships
    source: Mapped[EmissionSource] = relationship("EmissionSource", back_populates="records")

    __table_args__ = (
        # Prevent duplicate records
        UniqueConstraint(
            "emission_source_id",
            "year",
            "month",
            "scope",
            "market_factor_type",
            "upstream",
            name="uq_emission_record",
        ),
        # Time series queries per source
        Index("ix_emission_records_source_time", "emission_source_id", "year", "month"),
        # Aggregation queries across org
        Index(
            "ix_emission_records_aggregation", "year", "scope", "market_factor_type"
        ),
        # Monthly rollups
        Index("ix_emission_records_monthly", "year", "month"),
    )

    def __repr__(self) -> str:
        return (
            f"<EmissionRecord source={self.emission_source_id!r}"
            f" {self.year}-{self.month:02d} scope={self.scope}"
            f" {self.market_factor_type} co2e_kg={self.co2e_kg}>"
        )
