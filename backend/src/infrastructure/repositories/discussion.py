"""Discussion repository."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.domain.models.discussion import DiscussionThread, DiscussionReply
from src.infrastructure.repositories.base import BaseRepository


class DiscussionThreadRepository(BaseRepository[DiscussionThread]):
    """Repository for DiscussionThread operations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, DiscussionThread)

    async def get_by_competition(
        self,
        competition_id: int,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> list[DiscussionThread]:
        """Get all threads for a competition, ordered by pinned then recent."""
        stmt = (
            select(DiscussionThread)
            .where(DiscussionThread.competition_id == competition_id)
            .options(selectinload(DiscussionThread.author))
            .order_by(
                DiscussionThread.is_pinned.desc(),
                DiscussionThread.created_at.desc(),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_with_replies(self, thread_id: int) -> DiscussionThread | None:
        """Get a thread with all its replies loaded."""
        stmt = (
            select(DiscussionThread)
            .where(DiscussionThread.id == thread_id)
            .options(
                selectinload(DiscussionThread.author),
                selectinload(DiscussionThread.replies).selectinload(
                    DiscussionReply.author
                ),
            )
            .execution_options(populate_existing=True)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_by_competition(self, competition_id: int) -> int:
        """Count threads in a competition."""
        from sqlalchemy import func

        stmt = (
            select(func.count())
            .select_from(DiscussionThread)
            .where(DiscussionThread.competition_id == competition_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0


class DiscussionReplyRepository(BaseRepository[DiscussionReply]):
    """Repository for DiscussionReply operations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, DiscussionReply)

    async def count_by_thread(self, thread_id: int) -> int:
        """Count replies in a thread."""
        from sqlalchemy import func

        stmt = (
            select(func.count())
            .select_from(DiscussionReply)
            .where(DiscussionReply.thread_id == thread_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0
