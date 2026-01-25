"""Dashboard API schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from src.domain.models.competition import CompetitionStatus
from src.domain.models.submission import SubmissionStatus


class EnrolledCompetitionResponse(BaseModel):
    """Response schema for an enrolled competition."""

    model_config = ConfigDict(from_attributes=True)

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


class RecentSubmissionResponse(BaseModel):
    """Response schema for a recent submission."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    competition_id: int
    competition_title: str
    competition_slug: str
    status: SubmissionStatus
    public_score: float | None
    submitted_at: datetime


class DashboardNotificationResponse(BaseModel):
    """Response schema for a dashboard notification."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    message: str
    link: str | None
    is_read: bool
    created_at: datetime


class DashboardStatsResponse(BaseModel):
    """Response schema for dashboard stats."""

    total_competitions: int
    active_competitions: int
    total_submissions: int
    unread_notifications: int


class DashboardResponse(BaseModel):
    """Response schema for the full dashboard."""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    display_name: str
    active_competitions: list[EnrolledCompetitionResponse]
    recent_submissions: list[RecentSubmissionResponse]
    notifications: list[DashboardNotificationResponse]
    stats: DashboardStatsResponse
