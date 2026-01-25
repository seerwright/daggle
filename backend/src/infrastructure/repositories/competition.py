"""Competition repository."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.competition import Competition, CompetitionStatus
from src.infrastructure.repositories.base import BaseRepository


class CompetitionRepository(BaseRepository[Competition]):
    """Repository for Competition operations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Competition)

    async def get_by_slug(self, slug: str) -> Competition | None:
        """Get competition by slug."""
        stmt = select(Competition).where(Competition.slug == slug)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active(self, *, skip: int = 0, limit: int = 100) -> list[Competition]:
        """Get all active competitions."""
        stmt = (
            select(Competition)
            .where(Competition.status == CompetitionStatus.ACTIVE)
            .where(Competition.is_public.is_(True))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_sponsor(
        self, sponsor_id: int, *, skip: int = 0, limit: int = 100
    ) -> list[Competition]:
        """Get competitions by sponsor."""
        stmt = (
            select(Competition)
            .where(Competition.sponsor_id == sponsor_id)
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def slug_exists(self, slug: str) -> bool:
        """Check if slug is already in use."""
        competition = await self.get_by_slug(slug)
        return competition is not None
