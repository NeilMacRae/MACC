"""Scenario and ScenarioInitiative SQLAlchemy models."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Scenario(Base):
    """A named portfolio of initiatives for pathway comparison.

    At most one scenario per organisation may have is_baseline=True
    (enforced at the application/service layer, not via DB constraint).
    """

    __tablename__ = "scenarios"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_baseline: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, onupdate=_now
    )

    # Relationships
    organisation: Mapped[object] = relationship("Organisation", back_populates="scenarios")
    initiative_links: Mapped[list[ScenarioInitiative]] = relationship(
        "ScenarioInitiative", back_populates="scenario", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_scenarios_organisation_id", "organisation_id"),)

    def __repr__(self) -> str:
        return f"<Scenario id={self.id!r} name={self.name!r} baseline={self.is_baseline}>"


class ScenarioInitiative(Base):
    """Link table: Scenario ↔ AbatementInitiative with display ordering."""

    __tablename__ = "scenario_initiatives"

    scenario_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("scenarios.id", ondelete="CASCADE"), primary_key=True
    )
    initiative_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("abatement_initiatives.id", ondelete="CASCADE"),
        primary_key=True,
    )
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_included: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    scenario: Mapped[Scenario] = relationship("Scenario", back_populates="initiative_links")
    initiative: Mapped[object] = relationship(
        "AbatementInitiative", back_populates="scenario_links"
    )
