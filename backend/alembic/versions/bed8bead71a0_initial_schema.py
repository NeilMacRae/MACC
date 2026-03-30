"""initial_schema

Revision ID: bed8bead71a0
Revises: 
Create Date: 2026-02-28 12:17:59.984927

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bed8bead71a0'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Table creation order matters for Postgres FK enforcement.
    # Circular FK between abatement_initiatives ↔ ai_suggestions is handled
    # by deferring the source_suggestion_id FK and adding it via create_foreign_key.

    # ── 1. organisations (no FK deps) ──────────────────────────────────────
    op.create_table('organisations',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('company', sa.String(length=255), nullable=False),
    sa.Column('root_company_unit_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('company'),
    sa.UniqueConstraint('root_company_unit_id')
    )

    # ── 2. ai_suggestion_requests (FK: organisations) ──────────────────────
    op.create_table('ai_suggestion_requests',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('organisation_id', sa.String(length=36), nullable=False),
    sa.Column('input_hash', sa.String(length=64), nullable=False),
    sa.Column('model_used', sa.String(length=50), nullable=False),
    sa.Column('input_token_count', sa.Integer(), nullable=True),
    sa.Column('output_token_count', sa.Integer(), nullable=True),
    sa.Column('latency_ms', sa.Integer(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('ai_suggestion_requests', schema=None) as batch_op:
        batch_op.create_index('ix_ai_suggestion_requests_org_id', ['organisation_id'], unique=False)

    # ── 3. abatement_initiatives (FK: organisations; circular FK to ai_suggestions added below) ──
    op.create_table('abatement_initiatives',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('organisation_id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('initiative_type', sa.String(length=20), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('cost_eur', sa.Float(), nullable=False),
    sa.Column('annual_saving_eur', sa.Float(), nullable=True),
    sa.Column('co2e_reduction_tonnes', sa.Float(), nullable=False),
    sa.Column('cost_per_tonne', sa.Float(), nullable=False),
    sa.Column('payback_years', sa.Float(), nullable=True),
    sa.Column('lifespan_years', sa.Integer(), nullable=True),
    sa.Column('owner', sa.String(length=255), nullable=True),
    sa.Column('confidence', sa.String(length=20), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('source_suggestion_id', sa.String(length=36), nullable=True),
    sa.Column('ai_rationale', sa.Text(), nullable=True),
    sa.Column('rejection_reason', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('abatement_initiatives', schema=None) as batch_op:
        batch_op.create_index('ix_abatement_initiatives_org_id', ['organisation_id'], unique=False)
        batch_op.create_index('ix_abatement_initiatives_status', ['status'], unique=False)
        batch_op.create_index('ix_abatement_initiatives_type', ['initiative_type'], unique=False)

    # ── 4. ai_suggestions (FK: ai_suggestion_requests, abatement_initiatives) ──
    op.create_table('ai_suggestions',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('request_id', sa.String(length=36), nullable=False),
    sa.Column('suggestion_data', sa.JSON(), nullable=False),
    sa.Column('accepted', sa.Boolean(), nullable=True),
    sa.Column('initiative_id', sa.String(length=36), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['initiative_id'], ['abatement_initiatives.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['request_id'], ['ai_suggestion_requests.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    # ── 5. Close circular FK: abatement_initiatives.source_suggestion_id → ai_suggestions ──
    op.create_foreign_key(
        'fk_abatement_source_suggestion',
        'abatement_initiatives', 'ai_suggestions',
        ['source_suggestion_id'], ['id'],
        ondelete='SET NULL',
    )

    # ── 6. ai_constraint_configs (FK: organisations) ────────────────────────
    op.create_table('ai_constraint_configs',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('organisation_id', sa.String(length=36), nullable=False),
    sa.Column('excluded_technologies', sa.JSON(), nullable=True),
    sa.Column('excluded_unit_ids', sa.JSON(), nullable=True),
    sa.Column('excluded_scopes', sa.JSON(), nullable=True),
    sa.Column('max_initiative_cost_eur', sa.Float(), nullable=True),
    sa.Column('min_confidence_level', sa.String(length=20), nullable=True),
    sa.Column('preferred_payback_years', sa.Integer(), nullable=True),
    sa.Column('industry_specific_filters', sa.JSON(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('organisation_id')
    )
    op.create_table('company_units',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('organisation_id', sa.String(length=36), nullable=False),
    sa.Column('company_unit_id', sa.Integer(), nullable=False),
    sa.Column('company_unit_name', sa.String(length=255), nullable=False),
    sa.Column('company_unit_type', sa.String(length=20), nullable=False),
    sa.Column('immediate_parent_id', sa.Integer(), nullable=True),
    sa.Column('immediate_parent_name', sa.String(length=255), nullable=True),
    sa.Column('facility_type', sa.String(length=100), nullable=True),
    sa.Column('city', sa.String(length=255), nullable=True),
    sa.Column('continent', sa.String(length=100), nullable=True),
    sa.Column('country', sa.String(length=100), nullable=True),
    sa.Column('country_code', sa.String(length=10), nullable=True),
    sa.Column('state', sa.String(length=100), nullable=True),
    sa.Column('state_code', sa.String(length=10), nullable=True),
    sa.Column('latitude', sa.Float(), nullable=True),
    sa.Column('longitude', sa.Float(), nullable=True),
    sa.Column('location_id', sa.Integer(), nullable=True),
    sa.Column('level_1', sa.String(length=255), nullable=True),
    sa.Column('level_2', sa.String(length=255), nullable=True),
    sa.Column('level_3', sa.String(length=255), nullable=True),
    sa.Column('external_id', sa.String(length=100), nullable=True),
    sa.Column('financial_year_start_day', sa.Integer(), nullable=True),
    sa.Column('financial_year_start_month', sa.Integer(), nullable=True),
    sa.Column('open_date', sa.Date(), nullable=True),
    sa.Column('close_date', sa.Date(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('company_unit_id')
    )
    with op.batch_alter_table('company_units', schema=None) as batch_op:
        batch_op.create_index('ix_company_units_country_code', ['country_code'], unique=False)
        batch_op.create_index('ix_company_units_immediate_parent_id', ['immediate_parent_id'], unique=False)
        batch_op.create_index('ix_company_units_organisation_id', ['organisation_id'], unique=False)
        batch_op.create_index('ix_company_units_type', ['company_unit_type'], unique=False)

    op.create_table('organisational_contexts',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('organisation_id', sa.String(length=36), nullable=False),
    sa.Column('industry_sector', sa.String(length=100), nullable=True),
    sa.Column('employee_count', sa.Integer(), nullable=True),
    sa.Column('annual_revenue_eur', sa.Float(), nullable=True),
    sa.Column('operating_geographies', sa.JSON(), nullable=True),
    sa.Column('sustainability_maturity', sa.String(length=20), nullable=True),
    sa.Column('budget_constraint_eur', sa.Float(), nullable=True),
    sa.Column('target_year', sa.Integer(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('organisation_id')
    )
    op.create_table('scenarios',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('organisation_id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('is_baseline', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('scenarios', schema=None) as batch_op:
        batch_op.create_index('ix_scenarios_organisation_id', ['organisation_id'], unique=False)

    op.create_table('sync_logs',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('organisation_id', sa.String(length=36), nullable=False),
    sa.Column('sync_type', sa.String(length=50), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('records_created', sa.Integer(), nullable=False),
    sa.Column('records_updated', sa.Integer(), nullable=False),
    sa.Column('correlation_id', sa.String(length=36), nullable=False),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('started_at', sa.DateTime(), nullable=False),
    sa.Column('completed_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('sync_logs', schema=None) as batch_op:
        batch_op.create_index('ix_sync_logs_organisation_id', ['organisation_id'], unique=False)

    op.create_table('emission_sources',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('company_unit_id', sa.String(length=36), nullable=False),
    sa.Column('answer_id', sa.Integer(), nullable=False),
    sa.Column('activity', sa.String(length=255), nullable=False),
    sa.Column('question', sa.String(length=255), nullable=False),
    sa.Column('question_group', sa.String(length=255), nullable=False),
    sa.Column('answer_unit', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['company_unit_id'], ['company_units.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('answer_id')
    )
    with op.batch_alter_table('emission_sources', schema=None) as batch_op:
        batch_op.create_index('ix_emission_sources_company_unit_id', ['company_unit_id'], unique=False)

    op.create_table('emission_targets',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('context_id', sa.String(length=36), nullable=False),
    sa.Column('target_year', sa.Integer(), nullable=False),
    sa.Column('target_type', sa.String(length=20), nullable=False),
    sa.Column('target_value_pct', sa.Float(), nullable=False),
    sa.Column('baseline_year', sa.Integer(), nullable=False),
    sa.Column('baseline_co2e_tonnes', sa.Float(), nullable=False),
    sa.Column('target_co2e_tonnes', sa.Float(), nullable=True),
    sa.Column('scope_coverage', sa.JSON(), nullable=True),
    sa.Column('source', sa.String(length=100), nullable=True),
    sa.Column('notes', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['context_id'], ['organisational_contexts.id'], name='fk_emission_targets_context_id', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('emission_targets', schema=None) as batch_op:
        batch_op.create_index('ix_emission_targets_context_year', ['context_id', 'target_year'], unique=False)

    op.create_table('scenario_initiatives',
    sa.Column('scenario_id', sa.String(length=36), nullable=False),
    sa.Column('initiative_id', sa.String(length=36), nullable=False),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.Column('is_included', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['initiative_id'], ['abatement_initiatives.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['scenario_id'], ['scenarios.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('scenario_id', 'initiative_id')
    )
    op.create_table('emission_records',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('emission_source_id', sa.String(length=36), nullable=False),
    sa.Column('year', sa.Integer(), nullable=False),
    sa.Column('month', sa.Integer(), nullable=False),
    sa.Column('scope', sa.Integer(), nullable=False),
    sa.Column('market_factor_type', sa.String(length=20), nullable=False),
    sa.Column('value', sa.Float(), nullable=False),
    sa.Column('co2e_kg', sa.Float(), nullable=False),
    sa.Column('quality', sa.String(length=20), nullable=True),
    sa.Column('upstream', sa.String(length=50), nullable=False),
    sa.Column('upstream_name', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['emission_source_id'], ['emission_sources.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('emission_source_id', 'year', 'month', 'scope', 'market_factor_type', 'upstream', name='uq_emission_record')
    )
    with op.batch_alter_table('emission_records', schema=None) as batch_op:
        batch_op.create_index('ix_emission_records_aggregation', ['year', 'scope', 'market_factor_type'], unique=False)
        batch_op.create_index('ix_emission_records_monthly', ['year', 'month'], unique=False)
        batch_op.create_index('ix_emission_records_source_time', ['emission_source_id', 'year', 'month'], unique=False)

    op.create_table('initiative_emission_sources',
    sa.Column('initiative_id', sa.String(length=36), nullable=False),
    sa.Column('emission_source_id', sa.String(length=36), nullable=False),
    sa.ForeignKeyConstraint(['emission_source_id'], ['emission_sources.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['initiative_id'], ['abatement_initiatives.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('initiative_id', 'emission_source_id')
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('initiative_emission_sources')
    with op.batch_alter_table('emission_records', schema=None) as batch_op:
        batch_op.drop_index('ix_emission_records_source_time')
        batch_op.drop_index('ix_emission_records_monthly')
        batch_op.drop_index('ix_emission_records_aggregation')

    op.drop_table('emission_records')
    op.drop_table('scenario_initiatives')
    with op.batch_alter_table('emission_targets', schema=None) as batch_op:
        batch_op.drop_index('ix_emission_targets_context_year')

    op.drop_table('emission_targets')
    with op.batch_alter_table('emission_sources', schema=None) as batch_op:
        batch_op.drop_index('ix_emission_sources_company_unit_id')

    op.drop_table('emission_sources')
    with op.batch_alter_table('sync_logs', schema=None) as batch_op:
        batch_op.drop_index('ix_sync_logs_organisation_id')

    op.drop_table('sync_logs')
    with op.batch_alter_table('scenarios', schema=None) as batch_op:
        batch_op.drop_index('ix_scenarios_organisation_id')

    op.drop_table('scenarios')
    op.drop_table('organisational_contexts')
    with op.batch_alter_table('company_units', schema=None) as batch_op:
        batch_op.drop_index('ix_company_units_type')
        batch_op.drop_index('ix_company_units_organisation_id')
        batch_op.drop_index('ix_company_units_immediate_parent_id')
        batch_op.drop_index('ix_company_units_country_code')

    op.drop_table('company_units')
    op.drop_table('ai_constraint_configs')
    # Drop circular FK before dropping ai_suggestions
    op.drop_constraint('fk_abatement_source_suggestion', 'abatement_initiatives', type_='foreignkey')
    op.drop_table('ai_suggestions')
    with op.batch_alter_table('abatement_initiatives', schema=None) as batch_op:
        batch_op.drop_index('ix_abatement_initiatives_type')
        batch_op.drop_index('ix_abatement_initiatives_status')
        batch_op.drop_index('ix_abatement_initiatives_org_id')

    op.drop_table('abatement_initiatives')
    with op.batch_alter_table('ai_suggestion_requests', schema=None) as batch_op:
        batch_op.drop_index('ix_ai_suggestion_requests_org_id')

    op.drop_table('ai_suggestion_requests')
    op.drop_table('organisations')
