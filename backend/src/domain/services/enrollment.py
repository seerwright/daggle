"""Enrollment service."""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.competition import Competition, CompetitionStatus
from src.domain.models.enrollment import Enrollment
from src.infrastructure.repositories.competition import CompetitionRepository
from src.infrastructure.repositories.enrollment import EnrollmentRepository


class EnrollmentService:
    """Service for competition enrollment operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.enrollment_repo = EnrollmentRepository(session)
        self.competition_repo = CompetitionRepository(session)

    async def enroll(self, user_id: int, competition_id: int) -> Enrollment:
        """Enroll a user in a competition."""
        # Check if competition exists
        competition = await self.competition_repo.get_by_id(competition_id)
        if not competition:
            raise ValueError("Competition not found")

        # Check if competition is active
        if competition.status != CompetitionStatus.ACTIVE:
            raise ValueError("Competition is not accepting enrollments")

        # Check enrollment dates
        # Handle both timezone-aware and naive datetimes (SQLite returns naive)
        now = datetime.now(timezone.utc)
        start_date = competition.start_date
        end_date = competition.end_date

        # Make dates comparable by ensuring consistent timezone handling
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)

        if now < start_date:
            raise ValueError("Competition has not started yet")
        if now > end_date:
            raise ValueError("Competition has ended")

        # Check if already enrolled
        if await self.enrollment_repo.is_enrolled(user_id, competition_id):
            raise ValueError("Already enrolled in this competition")

        # Create enrollment
        enrollment = Enrollment(
            user_id=user_id,
            competition_id=competition_id,
        )
        return await self.enrollment_repo.create(enrollment)

    async def unenroll(self, user_id: int, competition_id: int) -> bool:
        """Remove a user's enrollment from a competition."""
        # Check if enrolled
        if not await self.enrollment_repo.is_enrolled(user_id, competition_id):
            raise ValueError("Not enrolled in this competition")

        return await self.enrollment_repo.delete_by_user_and_competition(
            user_id, competition_id
        )

    async def is_enrolled(self, user_id: int, competition_id: int) -> bool:
        """Check if a user is enrolled in a competition."""
        return await self.enrollment_repo.is_enrolled(user_id, competition_id)

    async def get_enrollment(
        self, user_id: int, competition_id: int
    ) -> Enrollment | None:
        """Get a user's enrollment for a competition."""
        return await self.enrollment_repo.get_by_user_and_competition(
            user_id, competition_id
        )

    async def get_participant_count(self, competition_id: int) -> int:
        """Get the number of participants in a competition."""
        return await self.enrollment_repo.count_by_competition(competition_id)
