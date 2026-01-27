"""FAQ schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class FAQCreate(BaseModel):
    """Schema for creating a FAQ entry."""

    question: str = Field(min_length=5, max_length=500)
    answer: str = Field(min_length=5)
    display_order: int = Field(default=0, ge=0)


class FAQUpdate(BaseModel):
    """Schema for updating a FAQ entry."""

    question: str | None = Field(default=None, min_length=5, max_length=500)
    answer: str | None = Field(default=None, min_length=5)
    display_order: int | None = Field(default=None, ge=0)


class FAQResponse(BaseModel):
    """Schema for FAQ response."""

    id: int
    competition_id: int
    question: str
    answer: str
    display_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FAQReorderRequest(BaseModel):
    """Schema for reordering FAQ entries."""

    faq_ids: list[int] = Field(min_length=1, description="Ordered list of FAQ IDs")
