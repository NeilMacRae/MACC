"""AbatementInitiative and InitiativeEmissionSource SQLAlchemy models."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AbatementInitiative(Base):
    """A proposed action to reduce emissions.

    Supports both manually-created ('custom') and AI-suggested initiatives.
    cost_per_tonne is derived via lifecycle formula:
      (capex_gbp + opex_annual_gbp * lifespan_years) / co2e_reduction_annual_tonnes
    payback_years is computed: capex_gbp / abs(opex_annual_gbp) when opex < 0, else None.
    """

    __tablename__ = "abatement_initiatives"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    initiative_type: Mapped[str] = mapped_column(String(20), nullable=False, default="custom")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="idea")
    capex_gbp: Mapped[float] = mapped_column(Float, nullable=False)
    opex_annual_gbp: Mapped[float | None] = mapped_column(Float, nullable=True)
    co2e_reduction_annual_tonnes: Mapped[float] = mapped_column(Float, nullable=False)
    cost_per_tonne: Mapped[float] = mapped_column(Float, nullable=False)
    payback_years: Mapped[float | None] = mapped_column(Float, nullable=True)
    lifespan_years: Mapped[int] = mapped_column(Integer, nullable=False, server_default="10")
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    confidence: Mapped[str | None] = mapped_column(String(20), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_suggestion_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("ai_suggestions.id", ondelete="SET NULL"), nullable=True
    )
    ai_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, onupdate=_now
    )

    # Relationships
    organisation: Mapped[object] = relationship("Organisation", back_populates="initiatives")
    emission_source_links: Mapped[list[InitiativeEmissionSource]] = relationship(
        "InitiativeEmissionSource", back_populates="initiative", cascade="all, delete-orphan"
    )
    scenario_links: Mapped[list[object]] = relationship(
        "ScenarioInitiative", back_populates="initiative"
    )
    source_suggestion: Mapped[object | None] = relationship(
        "AISuggestion", foreign_keys=[source_suggestion_id]
    )

    __table_args__ = (
        Index("ix_abatement_initiatives_org_id", "organisation_id"),
        Index("ix_abatement_initiatives_status", "status"),
        Index("ix_abatement_initiatives_type", "initiative_type"),
    )

    def __repr__(self) -> str:
        return f"<AbatementInitiative id={self.id!r} name={self.name!r} status={self.status!r}>"


class InitiativeEmissionSource(Base):
    """Link table: AbatementInitiative ↔ EmissionSource (many-to-many)."""

    __tablename__ = "initiative_emission_sources"

    initiative_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("abatement_initiatives.id", ondelete="CASCADE"),
        primary_key=True,
    )
    emission_source_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("emission_sources.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # Relationships
    initiative: Mapped[AbatementInitiative] = relationship(
        "AbatementInitiative", back_populates="emission_source_links"
    )
    emission_source: Mapped[object] = relationship(
        "EmissionSource", back_populates="initiative_links"
    )
