"""rename_context_fields_to_gbp

Renames the EUR-named context columns to GBP:
  annual_revenue_eur   → annual_revenue_gbp
  budget_constraint_eur → budget_constraint_gbp

Revision ID: c1d2e3f4a5b6
Revises: a3f7c2d8e1b5
Create Date: 2026-03-01 01:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "a3f7c2d8e1b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("organisational_contexts") as batch_op:
        batch_op.alter_column("annual_revenue_eur", new_column_name="annual_revenue_gbp")
        batch_op.alter_column("budget_constraint_eur", new_column_name="budget_constraint_gbp")


def downgrade() -> None:
    with op.batch_alter_table("organisational_contexts") as batch_op:
        batch_op.alter_column("annual_revenue_gbp", new_column_name="annual_revenue_eur")
        batch_op.alter_column("budget_constraint_gbp", new_column_name="budget_constraint_eur")
