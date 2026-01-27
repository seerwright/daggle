"""Add thumbnail_path to competitions

Revision ID: 8c4e5f6a7b9d
Revises: 5a7b3c2d8e9f
Create Date: 2026-01-26 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c4e5f6a7b9d'
down_revision: Union[str, None] = '5a7b3c2d8e9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('competitions', sa.Column('thumbnail_path', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('competitions', 'thumbnail_path')
