"""Add title field to rule templates and custom_title to competition rules.

Revision ID: add_rule_titles
Revises: 
Create Date: 2026-01-28
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_rule_titles"
down_revision = "9a0c45c1a4c6"  # add_rule_templates_and_competition_rules
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add title column to rule_templates
    op.add_column(
        "rule_templates",
        sa.Column("title", sa.String(255), nullable=True, server_default=""),
    )
    
    # Add custom_title column to competition_rules
    op.add_column(
        "competition_rules",
        sa.Column("custom_title", sa.String(255), nullable=True),
    )
    
    # Update existing templates with titles (one at a time for asyncpg)
    updates = [
        ("Team Size Limit", "%maximum of%members%"),
        ("Team Mergers", "%Team mergers%"),
        ("One Team Per Participant", "%only belong to one team%"),
        ("Daily Submission Limit", "%submission limit%"),
        ("Code Submission Required", "%include source code%"),
        ("External Data Policy", "%External data%"),
        ("Private Leaderboard", "%private leaderboard%"),
        ("Tie-Breaking", "%Ties are broken%"),
        ("Open Discussion", "%Share knowledge%"),
        ("Citation Requirements", "%Cite sources%"),
        ("No Private Sharing", "%Private sharing%"),
        ("One Account Per Participant", "%Multiple accounts%"),
        ("Pre-trained Models", "%Pre-trained models%"),
        ("No Manual Labeling", "%Hand-labeling%"),
        ("Team Roster Lock", "%cannot be changed after%"),
        ("Final Submission Selection", "%select%submissions for final%"),
    ]
    for title, pattern in updates:
        op.execute(f"UPDATE rule_templates SET title = '{title}' WHERE template_text LIKE '{pattern}'")


def downgrade() -> None:
    op.drop_column("competition_rules", "custom_title")
    op.drop_column("rule_templates", "title")
