"""User dashboard service."""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.domain.models.competition import Competition, CompetitionStatus
from src.domain.models.enrollment import Enrollment
from src.domain.models.notification import Notification
from src.domain.models.submission import Submission, SubmissionStatus
from src.domain.models.user import User


@dataclass
class EnrolledCompetition:
    """Summary of a competition the user is enrolled in."""

    id: int
    title: str
    slug: str
    status: CompetitionStatus
    end_date: datetime
    days_remaining: int | None
    user_submission_count: int
    user_best_score: float | None
    user_rank: int | None
    total_participants: int


@dataclass
class RecentSubmission:
    """Summary of a recent submission."""

    id: int
    competition_id: int
    competition_title: str
    competition_slug: str
    status: SubmissionStatus
    public_score: float | None
    submitted_at: datetime


@dataclass
class DashboardNotification:
    """Notification for the dashboard feed."""

    id: int
    type: str
    title: str
    message: str
    link: str | None
    is_read: bool
    created_at: datetime


@dataclass
class DashboardData:
    """Aggregated dashboard data for a user."""

    user_id: int
    username: str
    display_name: str
    active_competitions: list[EnrolledCompetition]
    recent_submissions: list[RecentSubmission]
    notifications: list[DashboardNotification]
    stats: "DashboardStats"


@dataclass
class DashboardStats:
    """Quick stats for the dashboard."""

    total_competitions: int
    active_competitions: int
    total_submissions: int
    unread_notifications: int


class DashboardService:
    """Service for user dashboard data aggregation."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_dashboard(self, user: User) -> DashboardData:
        """Get aggregated dashboard data for a user.

        Args:
            user: The authenticated user

        Returns:
            DashboardData with competitions, submissions, and notifications
        """
        # Fetch all data in parallel-ish (still sequential but organized)
        active_competitions = await self._get_enrolled_competitions(user.id)
        recent_submissions = await self._get_recent_submissions(user.id, limit=10)
        notifications = await self._get_notifications(user.id, limit=10)
        stats = await self._get_stats(user.id)

        return DashboardData(
            user_id=user.id,
            username=user.username,
            display_name=user.display_name,
            active_competitions=active_competitions,
            recent_submissions=recent_submissions,
            notifications=notifications,
            stats=stats,
        )

    async def _get_enrolled_competitions(
        self, user_id: int
    ) -> list[EnrolledCompetition]:
        """Get competitions the user is enrolled in, prioritizing active ones."""
        from datetime import timezone

        now = datetime.now(timezone.utc)

        # Get enrollments with competitions
        # Use CASE to prioritize active competitions first
        from sqlalchemy import case

        status_priority = case(
            (Competition.status == CompetitionStatus.ACTIVE, 0),
            (Competition.status == CompetitionStatus.EVALUATION, 1),
            (Competition.status == CompetitionStatus.DRAFT, 2),
            (Competition.status == CompetitionStatus.COMPLETED, 3),
            (Competition.status == CompetitionStatus.ARCHIVED, 4),
            else_=5,
        )

        stmt = (
            select(Enrollment, Competition)
            .join(Competition, Enrollment.competition_id == Competition.id)
            .where(Enrollment.user_id == user_id)
            .order_by(
                # Active competitions first, then by end date
                status_priority,
                Competition.end_date.asc(),
            )
            .limit(10)
        )
        result = await self.session.execute(stmt)
        enrollments = result.all()

        competitions = []
        for enrollment, competition in enrollments:
            # Calculate days remaining for active competitions
            days_remaining = None
            if competition.status == CompetitionStatus.ACTIVE:
                end_date = competition.end_date
                if end_date.tzinfo is None:
                    end_date = end_date.replace(tzinfo=timezone.utc)
                delta = end_date - now
                days_remaining = max(0, delta.days)

            # Get user's submission stats for this competition
            submission_count, best_score = await self._get_user_competition_stats(
                user_id, competition.id, competition.evaluation_metric
            )

            # Get user's rank
            rank, total_participants = await self._get_user_rank(
                user_id, competition.id, competition.evaluation_metric
            )

            competitions.append(
                EnrolledCompetition(
                    id=competition.id,
                    title=competition.title,
                    slug=competition.slug,
                    status=competition.status,
                    end_date=competition.end_date,
                    days_remaining=days_remaining,
                    user_submission_count=submission_count,
                    user_best_score=best_score,
                    user_rank=rank,
                    total_participants=total_participants,
                )
            )

        return competitions

    async def _get_user_competition_stats(
        self, user_id: int, competition_id: int, metric: str
    ) -> tuple[int, float | None]:
        """Get user's submission count and best score for a competition."""
        from src.domain.scoring.metrics import is_lower_better

        lower_better = is_lower_better(metric)

        if lower_better:
            best_score_agg = func.min(Submission.public_score)
        else:
            best_score_agg = func.max(Submission.public_score)

        stmt = (
            select(
                func.count(Submission.id).label("count"),
                best_score_agg.label("best_score"),
            )
            .where(Submission.user_id == user_id)
            .where(Submission.competition_id == competition_id)
        )
        result = await self.session.execute(stmt)
        row = result.one()

        return row.count, row.best_score

    async def _get_user_rank(
        self, user_id: int, competition_id: int, metric: str
    ) -> tuple[int | None, int]:
        """Get user's rank in a competition."""
        from src.domain.scoring.metrics import is_lower_better

        lower_better = is_lower_better(metric)

        if lower_better:
            best_score_agg = func.min(Submission.public_score)
        else:
            best_score_agg = func.max(Submission.public_score)

        # Get all users' best scores
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

    async def _get_recent_submissions(
        self, user_id: int, limit: int = 10
    ) -> list[RecentSubmission]:
        """Get user's most recent submissions."""
        stmt = (
            select(Submission, Competition)
            .join(Competition, Submission.competition_id == Competition.id)
            .where(Submission.user_id == user_id)
            .order_by(Submission.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        return [
            RecentSubmission(
                id=submission.id,
                competition_id=competition.id,
                competition_title=competition.title,
                competition_slug=competition.slug,
                status=submission.status,
                public_score=submission.public_score,
                submitted_at=submission.created_at,
            )
            for submission, competition in rows
        ]

    async def _get_notifications(
        self, user_id: int, limit: int = 10
    ) -> list[DashboardNotification]:
        """Get user's recent notifications."""
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        notifications = result.scalars().all()

        return [
            DashboardNotification(
                id=n.id,
                type=n.type.value,
                title=n.title,
                message=n.message,
                link=n.link,
                is_read=n.is_read,
                created_at=n.created_at,
            )
            for n in notifications
        ]

    async def _get_stats(self, user_id: int) -> DashboardStats:
        """Get quick stats for the dashboard."""
        # Total competitions enrolled
        total_stmt = (
            select(func.count(Enrollment.id))
            .where(Enrollment.user_id == user_id)
        )
        total_result = await self.session.execute(total_stmt)
        total_competitions = total_result.scalar() or 0

        # Active competitions
        active_stmt = (
            select(func.count(Enrollment.id))
            .join(Competition, Enrollment.competition_id == Competition.id)
            .where(Enrollment.user_id == user_id)
            .where(Competition.status == CompetitionStatus.ACTIVE)
        )
        active_result = await self.session.execute(active_stmt)
        active_competitions = active_result.scalar() or 0

        # Total submissions
        submissions_stmt = (
            select(func.count(Submission.id))
            .where(Submission.user_id == user_id)
        )
        submissions_result = await self.session.execute(submissions_stmt)
        total_submissions = submissions_result.scalar() or 0

        # Unread notifications
        unread_stmt = (
            select(func.count(Notification.id))
            .where(Notification.user_id == user_id)
            .where(Notification.is_read == False)  # noqa: E712
        )
        unread_result = await self.session.execute(unread_stmt)
        unread_notifications = unread_result.scalar() or 0

        return DashboardStats(
            total_competitions=total_competitions,
            active_competitions=active_competitions,
            total_submissions=total_submissions,
            unread_notifications=unread_notifications,
        )
