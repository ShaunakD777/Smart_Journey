"""Initial schema — users, trip_sessions, trip_plans, agent_logs

Revision ID: 001
Revises:
Create Date: 2026-07-13 00:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(150), nullable=False),
        sa.Column('hashed_password', sa.String(200), nullable=False),
        sa.Column('settings', JSON),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    op.create_table(
        'trip_sessions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('raw_query', sa.Text, nullable=False),
        sa.Column('destination', sa.String(200)),
        sa.Column('origin', sa.String(200)),
        sa.Column('duration_days', sa.Integer),
        sa.Column('travel_month', sa.String(50)),
        sa.Column('num_travelers', sa.Integer),
        sa.Column('budget_inr', sa.Float),
        sa.Column('interests', JSON, server_default='[]'),
        sa.Column('avoid', JSON, server_default='[]'),
        sa.Column('status', sa.String(50), server_default='pending'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
    )

    op.create_table(
        'trip_plans',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', UUID(as_uuid=True), sa.ForeignKey('trip_sessions.id'), nullable=False),
        sa.Column('flights', JSON, server_default='{}'),
        sa.Column('hotels', JSON, server_default='{}'),
        sa.Column('weather', JSON, server_default='{}'),
        sa.Column('food', JSON, server_default='{}'),
        sa.Column('itinerary', JSON, server_default='{}'),
        sa.Column('route', JSON, server_default='{}'),
        sa.Column('budget', JSON, server_default='{}'),
        sa.Column('currency', JSON, server_default='{}'),
        sa.Column('visa', JSON, server_default='{}'),
        sa.Column('packing_list', JSON, server_default='[]'),
        sa.Column('tourist_attractions', JSON, server_default='[]'),
        sa.Column('full_plan_json', JSON, server_default='{}'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        'agent_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', UUID(as_uuid=True), sa.ForeignKey('trip_sessions.id'), nullable=False),
        sa.Column('agent_name', sa.String(100), nullable=False),
        sa.Column('status', sa.String(50), server_default='pending'),
        sa.Column('input_data', JSON, server_default='{}'),
        sa.Column('output_data', JSON, server_default='{}'),
        sa.Column('error_message', sa.Text),
        sa.Column('duration_ms', sa.Integer),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('agent_logs')
    op.drop_table('trip_plans')
    op.drop_table('trip_sessions')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
