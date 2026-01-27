"""Competition schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from src.config import settings
from src.domain.models.competition import CompetitionStatus, Difficulty


def _path_to_url(path: str | None) -> str | None:
    """Convert a filesystem path to an API URL.

    Converts paths like '/tmp/daggle/uploads/thumbnails/1/thumbnail.jpg'
    to '/api/uploads/thumbnails/1/thumbnail.jpg'.
    """
    if not path:
        return None
    # Remove the upload_dir prefix to get the relative path
    upload_dir = settings.upload_dir.rstrip("/")
    if path.startswith(upload_dir):
        relative_path = path[len(upload_dir):]
        return f"/api/uploads{relative_path}"
    return None


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
    thumbnail_url: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_extras(cls, obj) -> "CompetitionResponse":
        """Create response with computed fields."""
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
            "thumbnail_url": _path_to_url(obj.thumbnail_path),
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
    thumbnail_url: str | None = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_thumbnail(cls, obj) -> "CompetitionListResponse":
        """Create response with thumbnail_url from thumbnail_path."""
        return cls(
            id=obj.id,
            title=obj.title,
            slug=obj.slug,
            short_description=obj.short_description,
            status=obj.status,
            start_date=obj.start_date,
            end_date=obj.end_date,
            difficulty=obj.difficulty,
            is_public=obj.is_public,
            thumbnail_url=_path_to_url(obj.thumbnail_path),
        )
