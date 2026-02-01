"""Add notifications table

Revision ID: 3f8a2b1c9d4e
Revises: 12b069ee7dba
Create Date: 2026-01-25 18:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f8a2b1c9d4e'
down_revision: Union[str, None] = '12b069ee7dba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('SUBMISSION_SCORED', 'SUBMISSION_FAILED', 'COMPETITION_UPDATE',
                                   'COMPETITION_STARTED', 'COMPETITION_ENDING', 'DISCUSSION_REPLY',
                                   'DISCUSSION_MENTION', 'TEAM_INVITATION', 'TEAM_MEMBER_JOINED',
                                   'TEAM_REMOVED', 'TEAM_LEADERSHIP', 'SYSTEM',
                                   name='notificationtype'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('link', sa.String(length=500), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, default=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'], unique=False)
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_notifications_is_read', table_name='notifications')
    op.drop_index('ix_notifications_user_id', table_name='notifications')
    op.drop_table('notifications')
    op.execute('DROP TYPE notificationtype')
