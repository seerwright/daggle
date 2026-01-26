"""User profile service."""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.competition import Competition, CompetitionStatus
from src.domain.models.enrollment import Enrollment
from src.domain.models.submission import Submission, SubmissionStatus
from src.domain.models.user import User
from src.domain.scoring.metrics import is_lower_better
from src.infrastructure.repositories.user import UserRepository


@dataclass
class CompetitionParticipation:
    """User's participation in a competition."""

    competition_id: int
    competition_title: str
    competition_slug: str
    status: CompetitionStatus
    enrolled_at: datetime
    submission_count: int
    best_score: float | None
    rank: int | None
    total_participants: int


@dataclass
class UserProfile:
    """Public user profile data."""

    id: int
    username: str
    display_name: str
    joined_at: datetime
    competitions_entered: int
    total_submissions: int
    best_rank: int | None
    participations: list[CompetitionParticipation]


class ProfileService:
    """Service for user profile operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.user_repo = UserRepository(session)

    async def update_profile(self, user: User, display_name: str | None = None) -> User:
        """Update user profile.

        Args:
            user: The user to update
            display_name: New display name (if provided)

        Returns:
            Updated user
        """
        if display_name is not None:
            user.display_name = display_name

        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def get_profile(self, username: str) -> UserProfile | None:
        """Get public profile for a user.

        Args:
            username: Username to look up

        Returns:
            UserProfile if user exists, None otherwise
        """
        user = await self.user_repo.get_by_username(username)
        if not user:
            return None

        # Get competition participations
        participations = await self._get_participations(user.id)

        # Calculate stats
        total_submissions = sum(p.submission_count for p in participations)
        ranks = [p.rank for p in participations if p.rank is not None]
        best_rank = min(ranks) if ranks else None

        return UserProfile(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            joined_at=user.created_at,
            competitions_entered=len(participations),
            total_submissions=total_submissions,
            best_rank=best_rank,
            participations=participations,
        )

    async def _get_participations(self, user_id: int) -> list[CompetitionParticipation]:
        """Get user's competition participations with stats.

        Args:
            user_id: User ID

        Returns:
            List of competition participations with scores and ranks
        """
        # Get enrollments with competitions
        stmt = (
            select(Enrollment, Competition)
            .join(Competition, Enrollment.competition_id == Competition.id)
            .where(Enrollment.user_id == user_id)
            .order_by(Enrollment.created_at.desc())
        )
        result = await self.session.execute(stmt)
        enrollments = result.all()

        participations = []
        for enrollment, competition in enrollments:
            # Get submission stats for this competition
            submission_count = await self._get_submission_count(
                user_id, competition.id
            )
            best_score = await self._get_best_score(
                user_id, competition.id, competition.evaluation_metric
            )
            rank, total_participants = await self._get_rank(
                user_id, competition.id, competition.evaluation_metric
            )

            participations.append(
                CompetitionParticipation(
                    competition_id=competition.id,
                    competition_title=competition.title,
                    competition_slug=competition.slug,
                    status=competition.status,
                    enrolled_at=enrollment.created_at,
                    submission_count=submission_count,
                    best_score=best_score,
                    rank=rank,
                    total_participants=total_participants,
                )
            )

        return participations

    async def _get_submission_count(
        self, user_id: int, competition_id: int
    ) -> int:
        """Get number of submissions by user for a competition."""
        stmt = (
            select(func.count(Submission.id))
            .where(Submission.user_id == user_id)
            .where(Submission.competition_id == competition_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def _get_best_score(
        self, user_id: int, competition_id: int, metric: str
    ) -> float | None:
        """Get user's best score for a competition."""
        lower_better = is_lower_better(metric)

        if lower_better:
            agg_func = func.min(Submission.public_score)
        else:
            agg_func = func.max(Submission.public_score)

        stmt = (
            select(agg_func)
            .where(Submission.user_id == user_id)
            .where(Submission.competition_id == competition_id)
            .where(Submission.status == SubmissionStatus.SCORED)
        )
        result = await self.session.execute(stmt)
        return result.scalar()

    async def _get_rank(
        self, user_id: int, competition_id: int, metric: str
    ) -> tuple[int | None, int]:
        """Get user's rank in a competition.

        Args:
            user_id: User ID
            competition_id: Competition ID
            metric: Evaluation metric name

        Returns:
            Tuple of (rank, total_participants). Rank is None if no scored submissions.
        """
        lower_better = is_lower_better(metric)

        if lower_better:
            best_score_agg = func.min(Submission.public_score)
        else:
            best_score_agg = func.max(Submission.public_score)

        # Get all users' best scores for this competition
        stmt = (
            select(
                Submission.user_id,
                best_score_agg.label("best_score"),
            )
            .where(Submission.competition_id == competition_id)
            .where(Submission.status == SubmissionStatus.SCORED)
            .group_by(Submission.user_id)
        )

        if lower_better:
            stmt = stmt.order_by(best_score_agg.asc())
        else:
            stmt = stmt.order_by(best_score_agg.desc())

        result = await self.session.execute(stmt)
        rows = result.all()

        total_participants = len(rows)
        user_rank = None

        for rank, row in enumerate(rows, 1):
            if row.user_id == user_id:
                user_rank = rank
                break

        return user_rank, total_participants
