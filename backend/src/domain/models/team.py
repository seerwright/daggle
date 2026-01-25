"""Team models."""

import enum

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class TeamRole(enum.Enum):
    """Role within a team."""

    LEADER = "leader"
    MEMBER = "member"


class Team(Base, TimestampMixin):
    """Team for competition participation."""

    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"))

    # Relationships
    competition: Mapped["Competition"] = relationship(  # noqa: F821
        back_populates="teams",
    )
    members: Mapped[list["TeamMember"]] = relationship(
        back_populates="team",
        lazy="selectin",
    )
    submissions: Mapped[list["Submission"]] = relationship(  # noqa: F821
        back_populates="team",
        lazy="selectin",
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
