"""Competition FAQ model."""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class CompetitionFAQ(Base, TimestampMixin):
    """FAQ entry for a competition."""

    __tablename__ = "competition_faqs"

    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(
        ForeignKey("competitions.id", ondelete="CASCADE"),
        index=True,
    )
    question: Mapped[str] = mapped_column(String(500))
    answer: Mapped[str] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    competition: Mapped["Competition"] = relationship(  # noqa: F821
        back_populates="faqs",
    )

    def __repr__(self) -> str:
        return f"<CompetitionFAQ(id={self.id}, competition_id={self.competition_id})>"
