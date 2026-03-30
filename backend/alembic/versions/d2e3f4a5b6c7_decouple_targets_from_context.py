"""decouple_targets_from_context

Migrates emission_targets from being stored under organisational_contexts
to being stored directly under organisations.

Before: emission_targets.context_id → organisational_contexts.id (CASCADE)
After:  emission_targets.organisation_id → organisations.id (CASCADE)

This enables the Targets tab in the MACC Modelling hub to function
independently of whether an organisational context record exists.

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-03-04 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d2e3f4a5b6c7"
down_revision: Union[str, Sequence[str], None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add organisation_id to emission_targets, backfill, drop context_id."""
    # Step 1: Add organisation_id as nullable so we can backfill
    op.add_column(
        "emission_targets",
        sa.Column("organisation_id", sa.String(length=36), nullable=True),
    )

    # Step 2: Backfill organisation_id via join through organisational_contexts
    op.execute(
        """
        UPDATE emission_targets
        SET organisation_id = (
            SELECT oc.organisation_id
            FROM organisational_contexts oc
            WHERE oc.id = emission_targets.context_id
        )
        """
    )

    # Step 3: Recreate the table (SQLite batch mode) to:
    #   - drop context_id column
    #   - make organisation_id NOT NULL with FK to organisations
    #   - replace the old index with a new one on organisation_id
    with op.batch_alter_table("emission_targets", schema=None) as batch_op:
        batch_op.drop_index("ix_emission_targets_context_year")
        batch_op.drop_constraint("fk_emission_targets_context_id", type_="foreignkey")
        batch_op.drop_column("context_id")
        batch_op.alter_column(
            "organisation_id",
            nullable=False,
            existing_type=sa.String(length=36),
        )
        batch_op.create_foreign_key(
            "fk_emission_targets_organisation_id",
            "organisations",
            ["organisation_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_index(
            "ix_emission_targets_org_year",
            ["organisation_id", "target_year"],
            unique=False,
        )


def downgrade() -> None:
    """Restore context_id FK on emission_targets (best-effort backfill)."""
    # Step 1: Add context_id as nullable for backfill
    op.add_column(
        "emission_targets",
        sa.Column("context_id", sa.String(length=36), nullable=True),
    )

    # Step 2: Backfill context_id via join (only succeeds where context exists)
    op.execute(
        """
        UPDATE emission_targets
        SET context_id = (
            SELECT oc.id
            FROM organisational_contexts oc
            WHERE oc.organisation_id = emission_targets.organisation_id
        )
        """
    )

    # Step 3: Recreate table to drop organisation_id, enforce context_id NOT NULL + FK
    with op.batch_alter_table("emission_targets", schema=None) as batch_op:
        batch_op.drop_index("ix_emission_targets_org_year")
        batch_op.drop_constraint(
            "fk_emission_targets_organisation_id", type_="foreignkey"
        )
        batch_op.drop_column("organisation_id")
        batch_op.alter_column(
            "context_id",
            nullable=False,
            existing_type=sa.String(length=36),
        )
        batch_op.create_foreign_key(
            "fk_emission_targets_context_id",
            "organisational_contexts",
            ["context_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_index(
            "ix_emission_targets_context_year",
            ["context_id", "target_year"],
            unique=False,
        )
