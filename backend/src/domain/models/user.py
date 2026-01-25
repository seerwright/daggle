"""User model."""

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class UserRole(enum.Enum):
    """User roles in the system."""

    PARTICIPANT = "participant"
    SPONSOR = "sponsor"
    ADMIN = "admin"


class User(Base, TimestampMixin):
    """User account model."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        default=UserRole.PARTICIPANT,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    submissions: Mapped[list["Submission"]] = relationship(  # noqa: F821
        back_populates="user",
        lazy="selectin",
    )
    team_memberships: Mapped[list["TeamMember"]] = relationship(  # noqa: F821
        back_populates="user",
        lazy="selectin",
    )
    sponsored_competitions: Mapped[list["Competition"]] = relationship(  # noqa: F821
        back_populates="sponsor",
        lazy="selectin",
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(  # noqa: F821
        back_populates="user",
        lazy="selectin",
    )
    discussion_threads: Mapped[list["DiscussionThread"]] = relationship(  # noqa: F821
        back_populates="author",
        lazy="selectin",
    )
    discussion_replies: Mapped[list["DiscussionReply"]] = relationship(  # noqa: F821
        back_populates="author",
        lazy="selectin",
    )
    notifications: Mapped[list["Notification"]] = relationship(  # noqa: F821
        back_populates="user",
        lazy="selectin",
    )
    sent_invitations: Mapped[list["TeamInvitation"]] = relationship(  # noqa: F821
        back_populates="inviter",
        foreign_keys="TeamInvitation.inviter_id",
        lazy="selectin",
    )
    received_invitations: Mapped[list["TeamInvitation"]] = relationship(  # noqa: F821
        back_populates="invitee",
        foreign_keys="TeamInvitation.invitee_id",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username})>"
