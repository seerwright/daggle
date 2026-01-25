"""Discussion models for competition Q&A."""

from sqlalchemy import ForeignKey, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class DiscussionThread(Base, TimestampMixin):
    """A discussion thread within a competition."""

    __tablename__ = "discussion_threads"

    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"))
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    competition: Mapped["Competition"] = relationship(  # noqa: F821
        back_populates="discussion_threads"
    )
    author: Mapped["User"] = relationship(  # noqa: F821
        back_populates="discussion_threads"
    )
    replies: Mapped[list["DiscussionReply"]] = relationship(
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="DiscussionReply.created_at",
    )

    def __repr__(self) -> str:
        return f"<DiscussionThread(id={self.id}, title={self.title!r})>"


class DiscussionReply(Base, TimestampMixin):
    """A reply to a discussion thread."""

    __tablename__ = "discussion_replies"

    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("discussion_threads.id"))
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    content: Mapped[str] = mapped_column(Text)

    # Relationships
    thread: Mapped["DiscussionThread"] = relationship(back_populates="replies")
    author: Mapped["User"] = relationship(  # noqa: F821
        back_populates="discussion_replies"
    )

    def __repr__(self) -> str:
        return f"<DiscussionReply(id={self.id}, thread_id={self.thread_id})>"
