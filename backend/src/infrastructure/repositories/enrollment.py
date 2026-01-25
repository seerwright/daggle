"""Enrollment repository."""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.enrollment import Enrollment
from src.infrastructure.repositories.base import BaseRepository


class EnrollmentRepository(BaseRepository[Enrollment]):
    """Repository for Enrollment operations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Enrollment)

    async def get_by_user_and_competition(
        self, user_id: int, competition_id: int
    ) -> Enrollment | None:
        """Get enrollment for a user in a competition."""
        stmt = select(Enrollment).where(
            Enrollment.user_id == user_id,
            Enrollment.competition_id == competition_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def is_enrolled(self, user_id: int, competition_id: int) -> bool:
        """Check if user is enrolled in a competition."""
        enrollment = await self.get_by_user_and_competition(user_id, competition_id)
        return enrollment is not None

    async def count_by_competition(self, competition_id: int) -> int:
        """Count enrollments for a competition."""
        stmt = select(func.count(Enrollment.id)).where(
            Enrollment.competition_id == competition_id
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def delete_by_user_and_competition(
        self, user_id: int, competition_id: int
    ) -> bool:
        """Delete enrollment for a user in a competition."""
        enrollment = await self.get_by_user_and_competition(user_id, competition_id)
        if enrollment:
            await self.session.delete(enrollment)
            await self.session.commit()
            return True
        return False
