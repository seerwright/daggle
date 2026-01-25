"""User profile API schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from src.domain.models.competition import CompetitionStatus


class CompetitionParticipationResponse(BaseModel):
    """Response schema for a competition participation."""

    model_config = ConfigDict(from_attributes=True)

    competition_id: int
    competition_title: str
    competition_slug: str
    status: CompetitionStatus
    enrolled_at: datetime
    submission_count: int
    best_score: float | None
    rank: int | None
    total_participants: int


class UserProfileResponse(BaseModel):
    """Response schema for user profile."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    joined_at: datetime
    competitions_entered: int
    total_submissions: int
    best_rank: int | None
    participations: list[CompetitionParticipationResponse]


class ProfileStatsResponse(BaseModel):
    """Response schema for profile stats summary."""

    competitions_entered: int
    total_submissions: int
    best_rank: int | None
    active_competitions: int
