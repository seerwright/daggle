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
    has_truth_set: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_truth_set(cls, obj) -> "CompetitionResponse":
        """Create response with has_truth_set computed from solution_path."""
        data = {
            "id": obj.id,
            "title": obj.title,
            "slug": obj.slug,
            "description": obj.description,
            "short_description": obj.short_description,
            "sponsor_id": obj.sponsor_id,
            "status": obj.status,
            "start_date": obj.start_date,
            "end_date": obj.end_date,
            "difficulty": obj.difficulty,
            "max_team_size": obj.max_team_size,
            "daily_submission_limit": obj.daily_submission_limit,
            "evaluation_metric": obj.evaluation_metric,
            "is_public": obj.is_public,
            "has_truth_set": obj.solution_path is not None,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
        }
        return cls(**data)


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
