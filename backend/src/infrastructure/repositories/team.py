"""Team repository."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.team import Team, TeamMember
from src.infrastructure.repositories.base import BaseRepository


class TeamRepository(BaseRepository[Team]):
    """Repository for Team operations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Team)

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

    async def add_member(self, team: Team, member: TeamMember) -> TeamMember:
        """Add a member to a team."""
        self.session.add(member)
        await self.session.flush()
        await self.session.refresh(member)
        return member
