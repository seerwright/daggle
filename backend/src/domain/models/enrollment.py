"""Enrollment model for competition participation."""

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class Enrollment(Base, TimestampMixin):
    """Tracks user enrollment in competitions."""

    __tablename__ = "enrollments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"))

    # Relationships
    user: Mapped["User"] = relationship(back_populates="enrollments")  # noqa: F821
    competition: Mapped["Competition"] = relationship(  # noqa: F821
        back_populates="enrollments"
    )

    __table_args__ = (
        UniqueConstraint("user_id", "competition_id", name="uq_user_competition"),
    )

    def __repr__(self) -> str:
        return f"<Enrollment(user_id={self.user_id}, competition_id={self.competition_id})>"
