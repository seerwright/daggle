"""Add sponsor info fields to competitions.

Revision ID: add_sponsor_info_fields
Revises: add_favicon_to_branding
Create Date: 2026-02-12
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "add_sponsor_info_fields"
down_revision = "add_favicon_to_branding"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("competitions", sa.Column("sponsor_name", sa.String(255), nullable=True))
    op.add_column("competitions", sa.Column("sponsor_title", sa.String(255), nullable=True))
    op.add_column(
        "competitions", sa.Column("sponsor_contact_email", sa.String(255), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("competitions", "sponsor_contact_email")
    op.drop_column("competitions", "sponsor_title")
    op.drop_column("competitions", "sponsor_name")
