"""Rule template model for predefined competition rules."""

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class RuleTemplate(Base, TimestampMixin):
    """Predefined rule template that can be applied to competitions.

    Templates define reusable rules with a title and description.
    Examples:
    - Title: "One account per participant"
      Description: "You cannot sign up from multiple accounts..."
    - Title: "Team Size Limit"
      Description: "Teams may have a maximum of {n} members"
    """

    __tablename__ = "rule_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[str] = mapped_column(String(100), index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    template_text: Mapped[str] = mapped_column(Text)  # Description text
    has_parameter: Mapped[bool] = mapped_column(Boolean, default=False)
    parameter_type: Mapped[str | None] = mapped_column(String(50))  # 'number', 'date', 'text'
    parameter_label: Mapped[str | None] = mapped_column(String(100))
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Relationship to competition rules that use this template
    competition_rules: Mapped[list["CompetitionRule"]] = relationship(
        "CompetitionRule",
        back_populates="template",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<RuleTemplate(id={self.id}, category='{self.category}', template='{self.template_text[:50]}...')>"
