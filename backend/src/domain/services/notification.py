"""Notification service."""

import logging
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.notification import Notification, NotificationType
from src.infrastructure.repositories.notification import NotificationRepository

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for notification operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = NotificationRepository(session)

    async def create(
        self,
        user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        link: str | None = None,
    ) -> Notification:
        """Create a new notification.

        Args:
            user_id: User to notify
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            link: Optional link to related resource

        Returns:
            Created notification
        """
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            link=link,
        )
        return await self.repo.create(notification)

    async def get_user_notifications(
        self,
        user_id: int,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Notification]:
        """Get notifications for a user.

        Args:
            user_id: User ID
            unread_only: If True, only return unread notifications
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of notifications
        """
        return await self.repo.get_by_user(
            user_id, unread_only=unread_only, skip=skip, limit=limit
        )

    async def get_unread_count(self, user_id: int) -> int:
        """Get count of unread notifications for a user.

        Args:
            user_id: User ID

        Returns:
            Number of unread notifications
        """
        return await self.repo.count_unread(user_id)

    async def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read.

        Args:
            notification_id: Notification ID
            user_id: User ID (for ownership verification)

        Returns:
            True if notification was marked as read
        """
        return await self.repo.mark_as_read(notification_id, user_id)

    async def mark_all_as_read(self, user_id: int) -> int:
        """Mark all notifications as read for a user.

        Args:
            user_id: User ID

        Returns:
            Number of notifications marked as read
        """
        return await self.repo.mark_all_as_read(user_id)

    # Notification triggers - convenience methods for common notification types

    async def notify_submission_scored(
        self,
        user_id: int,
        competition_title: str,
        competition_slug: str,
        score: float,
    ) -> Notification:
        """Notify user that their submission was scored.

        Args:
            user_id: User to notify
            competition_title: Competition title
            competition_slug: Competition slug for link
            score: The submission score

        Returns:
            Created notification
        """
        return await self.create(
            user_id=user_id,
            notification_type=NotificationType.SUBMISSION_SCORED,
            title="Submission Scored",
            message=f"Your submission to '{competition_title}' received a score of {score:.4f}",
            link=f"/competitions/{competition_slug}",
        )

    async def notify_submission_failed(
        self,
        user_id: int,
        competition_title: str,
        competition_slug: str,
        error_message: str,
    ) -> Notification:
        """Notify user that their submission failed.

        Args:
            user_id: User to notify
            competition_title: Competition title
            competition_slug: Competition slug for link
            error_message: Error message

        Returns:
            Created notification
        """
        # Truncate error message if too long
        if len(error_message) > 200:
            error_message = error_message[:197] + "..."

        return await self.create(
            user_id=user_id,
            notification_type=NotificationType.SUBMISSION_FAILED,
            title="Submission Failed",
            message=f"Your submission to '{competition_title}' failed: {error_message}",
            link=f"/competitions/{competition_slug}",
        )

    async def notify_discussion_reply(
        self,
        user_id: int,
        thread_title: str,
        competition_slug: str,
        thread_id: int,
        replier_name: str,
    ) -> Notification:
        """Notify user of a reply to their discussion thread.

        Args:
            user_id: User to notify
            thread_title: Thread title
            competition_slug: Competition slug for link
            thread_id: Thread ID for link
            replier_name: Name of user who replied

        Returns:
            Created notification
        """
        return await self.create(
            user_id=user_id,
            notification_type=NotificationType.DISCUSSION_REPLY,
            title="New Reply",
            message=f"{replier_name} replied to your thread '{thread_title}'",
            link=f"/competitions/{competition_slug}/discussions/{thread_id}",
        )

    async def notify_competition_started(
        self,
        user_id: int,
        competition_title: str,
        competition_slug: str,
    ) -> Notification:
        """Notify user that a competition they enrolled in has started.

        Args:
            user_id: User to notify
            competition_title: Competition title
            competition_slug: Competition slug for link

        Returns:
            Created notification
        """
        return await self.create(
            user_id=user_id,
            notification_type=NotificationType.COMPETITION_STARTED,
            title="Competition Started",
            message=f"'{competition_title}' has started! You can now submit your predictions.",
            link=f"/competitions/{competition_slug}",
        )

    async def notify_competition_ending(
        self,
        user_id: int,
        competition_title: str,
        competition_slug: str,
        days_remaining: int,
    ) -> Notification:
        """Notify user that a competition is ending soon.

        Args:
            user_id: User to notify
            competition_title: Competition title
            competition_slug: Competition slug for link
            days_remaining: Days until competition ends

        Returns:
            Created notification
        """
        return await self.create(
            user_id=user_id,
            notification_type=NotificationType.COMPETITION_ENDING,
            title="Competition Ending Soon",
            message=f"'{competition_title}' ends in {days_remaining} day{'s' if days_remaining != 1 else ''}. Submit your final predictions!",
            link=f"/competitions/{competition_slug}",
        )
