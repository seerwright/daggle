"""Discussion schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class AuthorInfo(BaseModel):
    """Basic author information."""

    id: int
    username: str
    display_name: str

    class Config:
        from_attributes = True


class ThreadCreate(BaseModel):
    """Schema for creating a discussion thread."""

    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10)


class ReplyCreate(BaseModel):
    """Schema for creating a reply."""

    content: str = Field(..., min_length=1)


class ReplyResponse(BaseModel):
    """Schema for a reply response."""

    id: int
    thread_id: int
    content: str
    author: AuthorInfo
    created_at: datetime

    class Config:
        from_attributes = True


class ThreadListResponse(BaseModel):
    """Schema for thread in list view (without replies)."""

    id: int
    title: str
    content: str
    author: AuthorInfo
    is_pinned: bool
    is_locked: bool
    reply_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ThreadDetailResponse(BaseModel):
    """Schema for thread with replies."""

    id: int
    competition_id: int
    title: str
    content: str
    author: AuthorInfo
    is_pinned: bool
    is_locked: bool
    replies: list[ReplyResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ThreadsListResponse(BaseModel):
    """Schema for paginated threads list."""

    threads: list[ThreadListResponse]
    total: int
    skip: int
    limit: int
