"""OrganisationalContext and EmissionTarget SQLAlchemy models."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


class OrganisationalContext(Base):
    """Profile capturing org-level context for AI suggestions and reporting.

    One-to-one with Organisation.
    """

    __tablename__ = "organisational_contexts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    organisation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    industry_sector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    employee_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    annual_revenue_gbp: Mapped[float | None] = mapped_column(Float, nullable=True)
    operating_geographies: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    sustainability_maturity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    budget_constraint_gbp: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, onupdate=_now
    )

    # Relationships
    organisation: Mapped[object] = relationship("Organisation", back_populates="context")
    targets: Mapped[list[EmissionTarget]] = relationship(
        "EmissionTarget", back_populates="context", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<OrganisationalContext org={self.organisation_id!r}"
            f" sector={self.industry_sector!r}>"
        )


class EmissionTarget(Base):
    """A formal emissions reduction target for a specific milestone year."""

    __tablename__ = "emission_targets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    context_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("organisational_contexts.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_year: Mapped[int] = mapped_column(Integer, nullable=False)
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)
    target_value_pct: Mapped[float] = mapped_column(Float, nullable=False)
    baseline_year: Mapped[int] = mapped_column(Integer, nullable=False)
    baseline_co2e_tonnes: Mapped[float] = mapped_column(Float, nullable=False)
    target_co2e_tonnes: Mapped[float | None] = mapped_column(Float, nullable=True)
    scope_coverage: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)

    # Relationships
    context: Mapped[OrganisationalContext] = relationship(
        "OrganisationalContext", back_populates="targets"
    )

    __table_args__ = (
        Index("ix_emission_targets_context_year", "context_id", "target_year"),
    )

    def __repr__(self) -> str:
        return (
            f"<EmissionTarget year={self.target_year} type={self.target_type!r}"
            f" {self.target_value_pct}%>"
        )
