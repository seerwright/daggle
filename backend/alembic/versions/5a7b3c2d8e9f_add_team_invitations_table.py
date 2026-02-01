"""Add team_invitations table

Revision ID: 5a7b3c2d8e9f
Revises: 3f8a2b1c9d4e
Create Date: 2026-01-25 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a7b3c2d8e9f'
down_revision: Union[str, None] = '3f8a2b1c9d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('team_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('inviter_id', sa.Integer(), nullable=False),
        sa.Column('invitee_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED',
                                     name='invitationstatus'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.ForeignKeyConstraint(['inviter_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['invitee_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('team_id', 'invitee_id', 'status', name='uq_team_invitee_status')
    )
    op.create_index('ix_team_invitations_team_id', 'team_invitations', ['team_id'], unique=False)
    op.create_index('ix_team_invitations_inviter_id', 'team_invitations', ['inviter_id'], unique=False)
    op.create_index('ix_team_invitations_invitee_id', 'team_invitations', ['invitee_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_team_invitations_invitee_id', table_name='team_invitations')
    op.drop_index('ix_team_invitations_inviter_id', table_name='team_invitations')
    op.drop_index('ix_team_invitations_team_id', table_name='team_invitations')
    op.drop_table('team_invitations')
    op.execute('DROP TYPE invitationstatus')
