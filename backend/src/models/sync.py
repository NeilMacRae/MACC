"""AIConstraintConfig, AISuggestionRequest, AISuggestion, and SyncLog models."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


class AIConstraintConfig(Base):
    """User-defined constraints applied when generating AI suggestions.

    One-to-one with Organisation.
    """

    __tablename__ = "ai_constraint_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    organisation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    excluded_technologies: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    excluded_unit_ids: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    excluded_scopes: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)
    max_initiative_cost_eur: Mapped[float | None] = mapped_column(Float, nullable=True)
    min_confidence_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    preferred_payback_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    industry_specific_filters: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, onupdate=_now
    )

    def __repr__(self) -> str:
        return f"<AIConstraintConfig org={self.organisation_id!r}>"


class AISuggestionRequest(Base):
    """Audit log of AI suggestion generation requests.

    Also serves as the cache key: if input_hash matches a recent request,
    the cached suggestions are returned without calling the API again.
    """

    __tablename__ = "ai_suggestion_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False
    )
    input_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    model_used: Mapped[str] = mapped_column(String(50), nullable=False)
    input_token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)

    suggestions: Mapped[list[AISuggestion]] = relationship(
        "AISuggestion", back_populates="request", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_ai_suggestion_requests_org_id", "organisation_id"),)

    def __repr__(self) -> str:
        return f"<AISuggestionRequest id={self.id!r} status={self.status!r}>"


class AISuggestion(Base):
    """A single AI-generated abatement suggestion.

    Stores the full suggestion payload as JSON so it can be reviewed
    before being accepted and converted to an AbatementInitiative.
    """

    __tablename__ = "ai_suggestions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    request_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ai_suggestion_requests.id", ondelete="CASCADE"), nullable=False
    )
    suggestion_data: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    initiative_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("abatement_initiatives.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)

    request: Mapped[AISuggestionRequest] = relationship(
        "AISuggestionRequest", back_populates="suggestions"
    )
    initiative: Mapped[object | None] = relationship(
        "AbatementInitiative", foreign_keys=[initiative_id]
    )

    def __repr__(self) -> str:
        return f"<AISuggestion id={self.id!r} accepted={self.accepted}>"


class SyncLog(Base):
    """Audit trail for data synchronisation operations with EcoOnline."""

    __tablename__ = "sync_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    organisation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False
    )
    sync_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    records_created: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_updated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    correlation_id: Mapped[str] = mapped_column(String(36), nullable=False, default=_uuid)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    organisation: Mapped[object] = relationship("Organisation", back_populates="sync_logs")

    __table_args__ = (Index("ix_sync_logs_organisation_id", "organisation_id"),)

    def __repr__(self) -> str:
        return f"<SyncLog id={self.id!r} type={self.sync_type!r} status={self.status!r}>"
