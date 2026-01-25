"""Team repository."""

from datetime import datetime, timezone

from sqlalchemy import func, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.team import Team, TeamMember, TeamInvitation, InvitationStatus, TeamRole
from src.infrastructure.repositories.base import BaseRepository


class TeamRepository(BaseRepository[Team]):
    """Repository for Team operations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Team)

    async def get_by_name_and_competition(
        self, name: str, competition_id: int
    ) -> Team | None:
        """Get a team by name within a competition."""
        stmt = (
            select(Team)
            .where(Team.name == name)
            .where(Team.competition_id == competition_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_competition(
        self, competition_id: int, *, skip: int = 0, limit: int = 100
    ) -> list[Team]:
        """Get all teams for a competition."""
        stmt = (
            select(Team)
            .where(Team.competition_id == competition_id)
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_user_team(self, user_id: int, competition_id: int) -> Team | None:
        """Get the team a user belongs to in a specific competition."""
        stmt = (
            select(Team)
            .join(TeamMember)
            .where(TeamMember.user_id == user_id)
            .where(Team.competition_id == competition_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_member(self, team_id: int, user_id: int) -> TeamMember | None:
        """Get a specific team member."""
        stmt = (
            select(TeamMember)
            .where(TeamMember.team_id == team_id)
            .where(TeamMember.user_id == user_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_team_members(self, team_id: int) -> list[TeamMember]:
        """Get all members of a team."""
        stmt = select(TeamMember).where(TeamMember.team_id == team_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_members(self, team_id: int) -> int:
        """Count the number of members in a team."""
        stmt = (
            select(func.count(TeamMember.id))
            .where(TeamMember.team_id == team_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def add_member(self, member: TeamMember) -> TeamMember:
        """Add a member to a team."""
        self.session.add(member)
        await self.session.flush()
        await self.session.refresh(member)
        return member

    async def remove_member(self, team_id: int, user_id: int) -> bool:
        """Remove a member from a team."""
        stmt = (
            delete(TeamMember)
            .where(TeamMember.team_id == team_id)
            .where(TeamMember.user_id == user_id)
        )
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def update_member_role(
        self, team_id: int, user_id: int, role: TeamRole
    ) -> TeamMember | None:
        """Update a member's role."""
        member = await self.get_member(team_id, user_id)
        if member:
            member.role = role
            await self.session.flush()
            await self.session.refresh(member)
        return member


class TeamInvitationRepository(BaseRepository[TeamInvitation]):
    """Repository for TeamInvitation operations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, TeamInvitation)

    async def get_pending_for_user(self, user_id: int) -> list[TeamInvitation]:
        """Get all pending invitations for a user."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(TeamInvitation)
            .where(TeamInvitation.invitee_id == user_id)
            .where(TeamInvitation.status == InvitationStatus.PENDING)
            .where(TeamInvitation.expires_at > now)
            .order_by(TeamInvitation.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_pending_for_team(self, team_id: int) -> list[TeamInvitation]:
        """Get all pending invitations for a team."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(TeamInvitation)
            .where(TeamInvitation.team_id == team_id)
            .where(TeamInvitation.status == InvitationStatus.PENDING)
            .where(TeamInvitation.expires_at > now)
            .order_by(TeamInvitation.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_pending_invitation(
        self, team_id: int, invitee_id: int
    ) -> TeamInvitation | None:
        """Get a pending invitation for a specific user and team."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(TeamInvitation)
            .where(TeamInvitation.team_id == team_id)
            .where(TeamInvitation.invitee_id == invitee_id)
            .where(TeamInvitation.status == InvitationStatus.PENDING)
            .where(TeamInvitation.expires_at > now)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def expire_old_invitations(self) -> int:
        """Mark expired invitations as expired. Returns count of updated."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(TeamInvitation)
            .where(TeamInvitation.status == InvitationStatus.PENDING)
            .where(TeamInvitation.expires_at <= now)
        )
        result = await self.session.execute(stmt)
        invitations = result.scalars().all()

        count = 0
        for inv in invitations:
            inv.status = InvitationStatus.EXPIRED
            count += 1

        await self.session.flush()
        return count
