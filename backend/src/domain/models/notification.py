"""Notification model."""

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class NotificationType(enum.Enum):
    """Types of notifications."""

    SUBMISSION_SCORED = "submission_scored"
    SUBMISSION_FAILED = "submission_failed"
    COMPETITION_UPDATE = "competition_update"
    COMPETITION_STARTED = "competition_started"
    COMPETITION_ENDING = "competition_ending"
    DISCUSSION_REPLY = "discussion_reply"
    DISCUSSION_MENTION = "discussion_mention"
    SYSTEM = "system"


class Notification(Base, TimestampMixin):
    """User notification model."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    # Notification content
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType))
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)

    # Optional link to related resource
    link: Mapped[str | None] = mapped_column(String(500))

    # Read status
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    user: Mapped["User"] = relationship(  # noqa: F821
        back_populates="notifications",
    )

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, type={self.type.value}, read={self.is_read})>"
