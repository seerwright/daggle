"""Competition rule model for competition-specific rules."""

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class CompetitionRule(Base, TimestampMixin):
    """A rule applied to a specific competition.

    Can reference a RuleTemplate (for predefined rules) or contain
    custom_text for custom rules created by the sponsor.
    """

    __tablename__ = "competition_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(
        ForeignKey("competitions.id", ondelete="CASCADE"),
        index=True,
    )
    rule_template_id: Mapped[int | None] = mapped_column(
        ForeignKey("rule_templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    parameter_value: Mapped[str | None] = mapped_column(String(255))
    custom_text: Mapped[str | None] = mapped_column(Text)  # For custom rules (rule_template_id is NULL)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    competition: Mapped["Competition"] = relationship(
        "Competition",
        back_populates="rules",
    )
    template: Mapped["RuleTemplate | None"] = relationship(
        "RuleTemplate",
        back_populates="competition_rules",
    )

    def get_rendered_text(self) -> str:
        """Get the rule text with parameter value substituted."""
        if self.custom_text:
            return self.custom_text
        if self.template:
            text = self.template.template_text
            if self.template.has_parameter and self.parameter_value:
                # Replace {n}, {date}, or {text} with the actual value
                text = text.replace("{n}", self.parameter_value)
                text = text.replace("{date}", self.parameter_value)
                text = text.replace("{text}", self.parameter_value)
            return text
        return ""

    def __repr__(self) -> str:
        if self.custom_text:
            return f"<CompetitionRule(id={self.id}, custom='{self.custom_text[:30]}...')>"
        return f"<CompetitionRule(id={self.id}, template_id={self.rule_template_id})>"
