"""Admin API schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from src.domain.models.user import UserRole
from src.domain.models.competition import CompetitionStatus


class PlatformStatsResponse(BaseModel):
    """Response schema for platform statistics."""

    total_users: int
    active_users_last_30_days: int
    total_competitions: int
    active_competitions: int
    total_submissions: int
    submissions_last_7_days: int
    total_enrollments: int


class UserSummaryResponse(BaseModel):
    """Response schema for user summary (admin view)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    display_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login: datetime | None
    competition_count: int
    submission_count: int


class UserRoleUpdateRequest(BaseModel):
    """Request schema for updating user role."""

    role: UserRole


class AdminActionResponse(BaseModel):
    """Generic response for admin actions."""

    message: str
    success: bool = True


class AdminCompetitionResponse(BaseModel):
    """Response schema for competition (admin view with all fields)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    description: str
    short_description: str
    status: CompetitionStatus
    sponsor_id: int
    start_date: datetime
    end_date: datetime
    is_public: bool
    max_team_size: int
    daily_submission_limit: int
    evaluation_metric: str
    created_at: datetime
    updated_at: datetime
