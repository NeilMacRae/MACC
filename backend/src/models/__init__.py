"""SQLAlchemy models — import all here so Alembic autodiscovers metadata."""

from src.models.context import EmissionTarget, OrganisationalContext
from src.models.database import Base, engine, get_db, AsyncSessionLocal
from src.models.emissions import EmissionRecord, EmissionSource
from src.models.initiative import AbatementInitiative, InitiativeEmissionSource
from src.models.organisation import CompanyUnit, Organisation
from src.models.scenario import Scenario, ScenarioInitiative
from src.models.sync import AIConstraintConfig, AISuggestion, AISuggestionRequest, SyncLog

__all__ = [
    "Base",
    "engine",
    "get_db",
    "AsyncSessionLocal",
    "Organisation",
    "CompanyUnit",
    "EmissionSource",
    "EmissionRecord",
    "AbatementInitiative",
    "InitiativeEmissionSource",
    "Scenario",
    "ScenarioInitiative",
    "OrganisationalContext",
    "EmissionTarget",
    "AIConstraintConfig",
    "AISuggestionRequest",
    "AISuggestion",
    "SyncLog",
]
