"""Competition file schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class CompetitionFileCreate(BaseModel):
    """Schema for creating a competition file metadata entry."""

    display_name: str | None = Field(default=None, max_length=255)
    purpose: str | None = Field(default=None, description="Description of file purpose")


class CompetitionFileUpdate(BaseModel):
    """Schema for updating a competition file."""

    display_name: str | None = Field(default=None, max_length=255)
    purpose: str | None = None


class CompetitionFileResponse(BaseModel):
    """Schema for competition file response."""

    id: int
    competition_id: int
    filename: str
    display_name: str | None
    purpose: str | None
    file_path: str
    file_size: int | None
    file_type: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
