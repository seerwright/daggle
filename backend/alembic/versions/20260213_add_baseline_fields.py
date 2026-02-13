"""Add baseline fields to submissions and competitions.

Revision ID: add_baseline_fields
Revises: add_sponsor_info_fields
Create Date: 2026-02-13
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "add_baseline_fields"
down_revision = "add_sponsor_info_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "submissions",
        sa.Column("is_baseline", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "competitions",
        sa.Column(
            "baseline_submission_id",
            sa.Integer(),
            sa.ForeignKey("submissions.id"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("competitions", "baseline_submission_id")
    op.drop_column("submissions", "is_baseline")
