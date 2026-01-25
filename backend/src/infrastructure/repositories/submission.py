"""Submission repository."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.submission import Submission, SubmissionStatus
from src.infrastructure.repositories.base import BaseRepository


class SubmissionRepository(BaseRepository[Submission]):
    """Repository for Submission operations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Submission)

    async def get_by_competition(
        self, competition_id: int, *, skip: int = 0, limit: int = 100
    ) -> list[Submission]:
        """Get all submissions for a competition."""
        stmt = (
            select(Submission)
            .where(Submission.competition_id == competition_id)
            .order_by(Submission.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_user(
        self, user_id: int, competition_id: int, *, skip: int = 0, limit: int = 100
    ) -> list[Submission]:
        """Get all submissions by a user for a competition."""
        stmt = (
            select(Submission)
            .where(Submission.user_id == user_id)
            .where(Submission.competition_id == competition_id)
            .order_by(Submission.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_today_by_user(self, user_id: int, competition_id: int) -> int:
        """Count submissions made today by a user."""
        stmt = (
            select(func.count(Submission.id))
            .where(Submission.user_id == user_id)
            .where(Submission.competition_id == competition_id)
            .where(func.date(Submission.created_at) == func.current_date())
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def get_best_by_user(
        self, user_id: int, competition_id: int
    ) -> Submission | None:
        """Get user's best scoring submission."""
        stmt = (
            select(Submission)
            .where(Submission.user_id == user_id)
            .where(Submission.competition_id == competition_id)
            .where(Submission.status == SubmissionStatus.SCORED)
            .order_by(Submission.public_score.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
