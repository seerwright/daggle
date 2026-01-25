"""Submission schemas."""

from datetime import datetime

from pydantic import BaseModel

from src.domain.models.submission import SubmissionStatus


class SubmissionResponse(BaseModel):
    """Schema for submission response."""

    id: int
    competition_id: int
    user_id: int
    team_id: int | None
    file_name: str
    status: SubmissionStatus
    public_score: float | None
    error_message: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class SubmissionListResponse(BaseModel):
    """Schema for submission list item."""

    id: int
    file_name: str
    status: SubmissionStatus
    public_score: float | None
    created_at: datetime

    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    """Schema for leaderboard entry."""

    rank: int
    user_id: int | None  # None for team entries
    username: str | None  # None for team entries
    display_name: str
    team_id: int | None = None  # Set for team competitions
    team_name: str | None = None  # Set for team competitions
    best_score: float
    submission_count: int
    last_submission: datetime


class LeaderboardResponse(BaseModel):
    """Schema for leaderboard response."""

    competition_id: int
    competition_title: str
    entries: list[LeaderboardEntry]
    total_participants: int
    is_team_competition: bool = False
