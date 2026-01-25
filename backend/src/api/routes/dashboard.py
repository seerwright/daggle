"""User dashboard API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user
from src.api.schemas.dashboard import (
    DashboardResponse,
    DashboardStatsResponse,
    EnrolledCompetitionResponse,
    RecentSubmissionResponse,
    DashboardNotificationResponse,
)
from src.domain.models.user import User
from src.domain.services.dashboard import DashboardService
from src.infrastructure.database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's dashboard.

    Returns aggregated data including:
    - Active competition enrollments with progress
    - Recent submissions with scores
    - Recent notifications
    - Quick stats summary
    """
    service = DashboardService(db)
    dashboard = await service.get_dashboard(current_user)

    return DashboardResponse(
        user_id=dashboard.user_id,
        username=dashboard.username,
        display_name=dashboard.display_name,
        active_competitions=[
            EnrolledCompetitionResponse(
                id=c.id,
                title=c.title,
                slug=c.slug,
                status=c.status,
                end_date=c.end_date,
                days_remaining=c.days_remaining,
                user_submission_count=c.user_submission_count,
                user_best_score=c.user_best_score,
                user_rank=c.user_rank,
                total_participants=c.total_participants,
            )
            for c in dashboard.active_competitions
        ],
        recent_submissions=[
            RecentSubmissionResponse(
                id=s.id,
                competition_id=s.competition_id,
                competition_title=s.competition_title,
                competition_slug=s.competition_slug,
                status=s.status,
                public_score=s.public_score,
                submitted_at=s.submitted_at,
            )
            for s in dashboard.recent_submissions
        ],
        notifications=[
            DashboardNotificationResponse(
                id=n.id,
                type=n.type,
                title=n.title,
                message=n.message,
                link=n.link,
                is_read=n.is_read,
                created_at=n.created_at,
            )
            for n in dashboard.notifications
        ],
        stats=DashboardStatsResponse(
            total_competitions=dashboard.stats.total_competitions,
            active_competitions=dashboard.stats.active_competitions,
            total_submissions=dashboard.stats.total_submissions,
            unread_notifications=dashboard.stats.unread_notifications,
        ),
    )


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get quick stats for the current user.

    A lightweight endpoint for fetching just the stats summary.
    """
    service = DashboardService(db)
    stats = await service._get_stats(current_user.id)

    return DashboardStatsResponse(
        total_competitions=stats.total_competitions,
        active_competitions=stats.active_competitions,
        total_submissions=stats.total_submissions,
        unread_notifications=stats.unread_notifications,
    )
