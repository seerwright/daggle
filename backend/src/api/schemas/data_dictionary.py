"""Data dictionary schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class DataDictionaryEntryCreate(BaseModel):
    """Schema for creating a data dictionary entry."""

    column_name: str = Field(max_length=255)
    definition: str | None = None
    encoding: str | None = None
    display_order: int = Field(default=0, ge=0)


class DataDictionaryEntryUpdate(BaseModel):
    """Schema for updating a data dictionary entry."""

    column_name: str | None = Field(default=None, max_length=255)
    definition: str | None = None
    encoding: str | None = None
    display_order: int | None = Field(default=None, ge=0)


class DataDictionaryEntryResponse(BaseModel):
    """Schema for data dictionary entry response."""

    id: int
    file_id: int
    column_name: str
    definition: str | None
    encoding: str | None
    display_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DataDictionaryBulkUpdate(BaseModel):
    """Schema for bulk updating data dictionary entries."""

    entries: list[DataDictionaryEntryCreate]


class ColumnInfoResponse(BaseModel):
    """Schema for column info from auto-detection."""

    name: str
    dtype: str
    sample_values: list[str]
    null_count: int
    unique_count: int


class PreviewResponse(BaseModel):
    """Schema for CSV file preview."""

    columns: list[str]
    rows: list[dict[str, str]]
    total_rows: int
    truncated: bool
