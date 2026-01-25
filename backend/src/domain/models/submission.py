"""Submission model."""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class SubmissionStatus(enum.Enum):
    """Submission processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    SCORED = "scored"
    FAILED = "failed"


class Submission(Base, TimestampMixin):
    """Competition submission model."""

    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), index=True)

    # Submission data
    file_path: Mapped[str] = mapped_column(String(500))
    file_name: Mapped[str] = mapped_column(String(255))

    # Scoring
    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(SubmissionStatus),
        default=SubmissionStatus.PENDING,
    )
    public_score: Mapped[float | None] = mapped_column(Float)
    private_score: Mapped[float | None] = mapped_column(Float)
    error_message: Mapped[str | None] = mapped_column(Text)
    scored_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    competition: Mapped["Competition"] = relationship(  # noqa: F821
        back_populates="submissions",
    )
    user: Mapped["User"] = relationship(  # noqa: F821
        back_populates="submissions",
    )
    team: Mapped["Team | None"] = relationship(  # noqa: F821
        back_populates="submissions",
    )

    def __repr__(self) -> str:
        return f"<Submission(id={self.id}, status={self.status.value})>"
