"""Competition schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from src.domain.models.competition import CompetitionStatus, Difficulty


class CompetitionCreate(BaseModel):
    """Schema for creating a competition."""

    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=10)
    short_description: str = Field(min_length=10, max_length=500)
    start_date: datetime
    end_date: datetime
    difficulty: Difficulty
    max_team_size: int = Field(default=1, ge=1, le=10)
    daily_submission_limit: int = Field(default=5, ge=1, le=100)
    evaluation_metric: str = Field(min_length=1, max_length=100)
    is_public: bool = True


class CompetitionUpdate(BaseModel):
    """Schema for updating a competition."""

    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = Field(default=None, min_length=10)
    short_description: str | None = Field(default=None, min_length=10, max_length=500)
    start_date: datetime | None = None
    end_date: datetime | None = None
    difficulty: Difficulty | None = None
    max_team_size: int | None = Field(default=None, ge=1, le=10)
    daily_submission_limit: int | None = Field(default=None, ge=1, le=100)
    evaluation_metric: str | None = Field(default=None, min_length=1, max_length=100)
    is_public: bool | None = None
    status: CompetitionStatus | None = None


class CompetitionResponse(BaseModel):
    """Schema for competition response."""

    id: int
    title: str
    slug: str
    description: str
    short_description: str
    sponsor_id: int
    status: CompetitionStatus
    start_date: datetime
    end_date: datetime
    difficulty: Difficulty
    max_team_size: int
    daily_submission_limit: int
    evaluation_metric: str
    is_public: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompetitionListResponse(BaseModel):
    """Schema for competition list item (lighter weight)."""

    id: int
    title: str
    slug: str
    short_description: str
    status: CompetitionStatus
    start_date: datetime
    end_date: datetime
    difficulty: Difficulty
    is_public: bool

    class Config:
        from_attributes = True
