"""Add favicon_path to site_branding table.

Revision ID: add_favicon_to_branding
Revises: add_site_branding
Create Date: 2026-02-07
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_favicon_to_branding"
down_revision = "add_site_branding"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "site_branding",
        sa.Column("favicon_path", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("site_branding", "favicon_path")
