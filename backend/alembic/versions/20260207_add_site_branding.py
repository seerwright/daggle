"""Add site_branding table for company branding configuration.

Revision ID: add_site_branding
Revises: add_rule_titles
Create Date: 2026-02-07
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_site_branding"
down_revision = "add_rule_titles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "site_branding",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "company_name",
            sa.String(length=100),
            nullable=False,
            server_default="Your Company",
        ),
        sa.Column(
            "product_name",
            sa.String(length=100),
            nullable=False,
            server_default="Daggle",
        ),
        sa.Column(
            "tagline",
            sa.String(length=255),
            nullable=True,
            server_default="Internal Data Science Platform",
        ),
        sa.Column("logo_full_path", sa.String(length=500), nullable=True),
        sa.Column("logo_icon_path", sa.String(length=500), nullable=True),
        sa.Column("logo_full_light_path", sa.String(length=500), nullable=True),
        sa.Column("logo_icon_light_path", sa.String(length=500), nullable=True),
        sa.Column(
            "palette_id",
            sa.String(length=50),
            nullable=False,
            server_default="amber",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("id = 1", name="single_row_branding"),
    )

    # Insert default row
    op.execute(
        """
        INSERT INTO site_branding (id, company_name, product_name, tagline, palette_id)
        VALUES (1, 'Your Company', 'Daggle', 'Internal Data Science Platform', 'amber')
        """
    )


def downgrade() -> None:
    op.drop_table("site_branding")
