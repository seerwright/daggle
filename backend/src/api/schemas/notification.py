"""Notification API schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from src.domain.models.notification import NotificationType


class NotificationResponse(BaseModel):
    """Response schema for a notification."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    type: NotificationType
    title: str
    message: str
    link: str | None
    is_read: bool
    read_at: datetime | None
    created_at: datetime


class NotificationListResponse(BaseModel):
    """Response schema for notification list."""

    notifications: list[NotificationResponse]
    unread_count: int


class UnreadCountResponse(BaseModel):
    """Response schema for unread count."""

    unread_count: int


class MarkReadResponse(BaseModel):
    """Response schema for mark-as-read operations."""

    success: bool
    marked_count: int
