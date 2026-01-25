"""Team models."""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class TeamRole(enum.Enum):
    """Role within a team."""

    LEADER = "leader"
    MEMBER = "member"


class InvitationStatus(enum.Enum):
    """Status of a team invitation."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class Team(Base, TimestampMixin):
    """Team for competition participation."""

    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"), index=True)

    # Relationships
    competition: Mapped["Competition"] = relationship(  # noqa: F821
        back_populates="teams",
    )
    members: Mapped[list["TeamMember"]] = relationship(
        back_populates="team",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    submissions: Mapped[list["Submission"]] = relationship(  # noqa: F821
        back_populates="team",
        lazy="selectin",
    )
    invitations: Mapped[list["TeamInvitation"]] = relationship(
        back_populates="team",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("name", "competition_id", name="uq_team_name_competition"),
    )

    def __repr__(self) -> str:
        return f"<Team(id={self.id}, name={self.name})>"


class TeamMember(Base, TimestampMixin):
    """Association between users and teams."""

    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role: Mapped[TeamRole] = mapped_column(
        Enum(TeamRole),
        default=TeamRole.MEMBER,
    )

    # Relationships
    team: Mapped["Team"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="team_memberships")  # noqa: F821

    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_member"),
    )

    def __repr__(self) -> str:
        return f"<TeamMember(team_id={self.team_id}, user_id={self.user_id})>"


class TeamInvitation(Base, TimestampMixin):
    """Invitation to join a team."""

    __tablename__ = "team_invitations"

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    inviter_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    invitee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[InvitationStatus] = mapped_column(
        Enum(InvitationStatus),
        default=InvitationStatus.PENDING,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Relationships
    team: Mapped["Team"] = relationship(back_populates="invitations")
    inviter: Mapped["User"] = relationship(  # noqa: F821
        foreign_keys=[inviter_id],
        back_populates="sent_invitations",
    )
    invitee: Mapped["User"] = relationship(  # noqa: F821
        foreign_keys=[invitee_id],
        back_populates="received_invitations",
    )

    __table_args__ = (
        UniqueConstraint("team_id", "invitee_id", "status", name="uq_team_invitee_status"),
    )

    def __repr__(self) -> str:
        return f"<TeamInvitation(team_id={self.team_id}, invitee_id={self.invitee_id}, status={self.status.value})>"
