"""rename_initiative_fields_to_gbp

Renames initiative cost/reduction columns from the old EUR model to the new
GBP lifecycle model, and makes lifespan_years NOT NULL with DEFAULT 10.

Column changes:
  cost_eur                 → capex_gbp
  annual_saving_eur        → opex_annual_gbp
  co2e_reduction_tonnes    → co2e_reduction_annual_tonnes
  lifespan_years           → NOT NULL, DEFAULT 10 (backfill nulls → 10)

Also recomputes cost_per_tonne and payback_years using the lifecycle formula:
  cost_per_tonne  = (capex_gbp + opex_annual_gbp * lifespan_years)
                    / co2e_reduction_annual_tonnes
  payback_years   = capex_gbp / abs(opex_annual_gbp)  when opex < 0, else NULL

Revision ID: a3f7c2d8e1b5
Revises: bed8bead71a0
Create Date: 2026-03-01 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a3f7c2d8e1b5"
down_revision: Union[str, Sequence[str], None] = "bed8bead71a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename columns and recompute derived fields using lifecycle formula."""

    # Step 1: Rename columns only (keep lifespan_years nullable at this stage
    # so existing NULL rows can be copied to the temp table without error).
    with op.batch_alter_table("abatement_initiatives") as batch_op:
        batch_op.alter_column("cost_eur", new_column_name="capex_gbp")
        batch_op.alter_column("annual_saving_eur", new_column_name="opex_annual_gbp")
        batch_op.alter_column(
            "co2e_reduction_tonnes", new_column_name="co2e_reduction_annual_tonnes"
        )

    # Step 2: Backfill lifespan_years NULLs → 10 before adding NOT NULL.
    op.execute(
        "UPDATE abatement_initiatives SET lifespan_years = 10 WHERE lifespan_years IS NULL"
    )

    # Step 3: Now make lifespan_years NOT NULL (no NULLs exist any more).
    with op.batch_alter_table("abatement_initiatives") as batch_op:
        batch_op.alter_column(
            "lifespan_years",
            existing_type=sa.Integer(),
            nullable=False,
            server_default="10",
        )

    # Step 4: Recompute cost_per_tonne using lifecycle formula:
    #   (capex_gbp + COALESCE(opex_annual_gbp, 0) * lifespan_years)
    #   / co2e_reduction_annual_tonnes
    op.execute(
        """
        UPDATE abatement_initiatives
        SET cost_per_tonne = CASE
            WHEN co2e_reduction_annual_tonnes > 0
            THEN ROUND(
                CAST(
                    (capex_gbp + COALESCE(opex_annual_gbp, 0.0) * lifespan_years)
                    / co2e_reduction_annual_tonnes
                AS NUMERIC),
                4
            )
            ELSE 0.0
        END
        """
    )

    # Step 5: Recompute payback_years:
    #   capex_gbp / ABS(opex_annual_gbp) when opex < 0, else NULL
    op.execute(
        """
        UPDATE abatement_initiatives
        SET payback_years = CASE
            WHEN opex_annual_gbp IS NOT NULL AND opex_annual_gbp < 0
            THEN ROUND(CAST(capex_gbp / ABS(opex_annual_gbp) AS NUMERIC), 4)
            ELSE NULL
        END
        """
    )


def downgrade() -> None:
    """Reverse the rename (note: recomputed values are not restored exactly)."""

    with op.batch_alter_table("abatement_initiatives") as batch_op:
        batch_op.alter_column("capex_gbp", new_column_name="cost_eur")
        batch_op.alter_column("opex_annual_gbp", new_column_name="annual_saving_eur")
        batch_op.alter_column(
            "co2e_reduction_annual_tonnes", new_column_name="co2e_reduction_tonnes"
        )
        batch_op.alter_column(
            "lifespan_years",
            existing_type=sa.Integer(),
            nullable=True,
            server_default=None,
        )
