"""Integration tests for notifications."""

from datetime import datetime, timedelta, timezone

import pytest

from src.domain.models.competition import Competition, CompetitionStatus, Difficulty
from src.domain.models.notification import Notification, NotificationType
from src.domain.models.user import User, UserRole
from src.common.security import hash_password


class TestNotificationModel:
    """Tests for the Notification model."""

    @pytest.fixture
    async def sample_user(self, db_session):
        """Create a sample user."""
        user = User(
            email="notifyuser@example.com",
            username="notifyuser",
            hashed_password=hash_password("password123"),
            display_name="Notify User",
            role=UserRole.PARTICIPANT,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest.mark.asyncio
    async def test_create_notification(self, db_session, sample_user):
        """Test creating a notification."""
        notification = Notification(
            user_id=sample_user.id,
            type=NotificationType.SUBMISSION_SCORED,
            title="Submission Scored",
            message="Your submission received a score of 0.8500",
            link="/competitions/test-comp",
        )
        db_session.add(notification)
        await db_session.commit()
        await db_session.refresh(notification)

        assert notification.id is not None
        assert notification.type == NotificationType.SUBMISSION_SCORED
        assert notification.is_read is False
        assert notification.read_at is None

    @pytest.mark.asyncio
    async def test_notification_types(self, db_session, sample_user):
        """Test all notification types can be created."""
        types_to_test = [
            NotificationType.SUBMISSION_SCORED,
            NotificationType.SUBMISSION_FAILED,
            NotificationType.COMPETITION_UPDATE,
            NotificationType.DISCUSSION_REPLY,
            NotificationType.SYSTEM,
        ]

        for ntype in types_to_test:
            notification = Notification(
                user_id=sample_user.id,
                type=ntype,
                title=f"Test {ntype.value}",
                message=f"Test message for {ntype.value}",
            )
            db_session.add(notification)

        await db_session.commit()


class TestNotificationService:
    """Tests for the NotificationService."""

    @pytest.fixture
    async def sample_user(self, db_session):
        """Create a sample user."""
        user = User(
            email="notifyservice@example.com",
            username="notifyservice",
            hashed_password=hash_password("password123"),
            display_name="Notify Service User",
            role=UserRole.PARTICIPANT,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest.mark.asyncio
    async def test_create_notification(self, db_session, sample_user):
        """Test creating a notification via service."""
        from src.domain.services.notification import NotificationService

        service = NotificationService(db_session)
        notification = await service.create(
            user_id=sample_user.id,
            notification_type=NotificationType.SYSTEM,
            title="Test Notification",
            message="This is a test notification",
            link="/test",
        )

        assert notification.id is not None
        assert notification.user_id == sample_user.id
        assert notification.type == NotificationType.SYSTEM
        assert notification.is_read is False

    @pytest.mark.asyncio
    async def test_get_user_notifications(self, db_session, sample_user):
        """Test retrieving user notifications."""
        from src.domain.services.notification import NotificationService

        service = NotificationService(db_session)

        # Create multiple notifications
        for i in range(5):
            await service.create(
                user_id=sample_user.id,
                notification_type=NotificationType.SYSTEM,
                title=f"Notification {i}",
                message=f"Message {i}",
            )

        notifications = await service.get_user_notifications(sample_user.id)
        assert len(notifications) == 5

    @pytest.mark.asyncio
    async def test_get_unread_only(self, db_session, sample_user):
        """Test filtering for unread notifications only."""
        from src.domain.services.notification import NotificationService

        service = NotificationService(db_session)

        # Create 3 notifications
        for i in range(3):
            await service.create(
                user_id=sample_user.id,
                notification_type=NotificationType.SYSTEM,
                title=f"Notification {i}",
                message=f"Message {i}",
            )

        # Mark one as read
        notifications = await service.get_user_notifications(sample_user.id)
        await service.mark_as_read(notifications[0].id, sample_user.id)

        # Get unread only
        unread = await service.get_user_notifications(
            sample_user.id, unread_only=True
        )
        assert len(unread) == 2

    @pytest.mark.asyncio
    async def test_get_unread_count(self, db_session, sample_user):
        """Test getting unread count."""
        from src.domain.services.notification import NotificationService

        service = NotificationService(db_session)

        # Create 3 notifications
        for i in range(3):
            await service.create(
                user_id=sample_user.id,
                notification_type=NotificationType.SYSTEM,
                title=f"Notification {i}",
                message=f"Message {i}",
            )

        count = await service.get_unread_count(sample_user.id)
        assert count == 3

    @pytest.mark.asyncio
    async def test_mark_as_read(self, db_session, sample_user):
        """Test marking a notification as read."""
        from src.domain.services.notification import NotificationService

        service = NotificationService(db_session)

        notification = await service.create(
            user_id=sample_user.id,
            notification_type=NotificationType.SYSTEM,
            title="Test",
            message="Test",
        )

        success = await service.mark_as_read(notification.id, sample_user.id)
        assert success is True

        await db_session.refresh(notification)
        assert notification.is_read is True
        assert notification.read_at is not None

    @pytest.mark.asyncio
    async def test_mark_all_as_read(self, db_session, sample_user):
        """Test marking all notifications as read."""
        from src.domain.services.notification import NotificationService

        service = NotificationService(db_session)

        # Create 5 notifications
        for i in range(5):
            await service.create(
                user_id=sample_user.id,
                notification_type=NotificationType.SYSTEM,
                title=f"Notification {i}",
                message=f"Message {i}",
            )

        count = await service.mark_all_as_read(sample_user.id)
        assert count == 5

        unread_count = await service.get_unread_count(sample_user.id)
        assert unread_count == 0

    @pytest.mark.asyncio
    async def test_notify_submission_scored(self, db_session, sample_user):
        """Test the submission scored notification helper."""
        from src.domain.services.notification import NotificationService

        service = NotificationService(db_session)

        notification = await service.notify_submission_scored(
            user_id=sample_user.id,
            competition_title="Test Competition",
            competition_slug="test-competition",
            score=0.8567,
        )

        assert notification.type == NotificationType.SUBMISSION_SCORED
        assert "0.8567" in notification.message
        assert notification.link == "/competitions/test-competition"

    @pytest.mark.asyncio
    async def test_notify_discussion_reply(self, db_session, sample_user):
        """Test the discussion reply notification helper."""
        from src.domain.services.notification import NotificationService

        service = NotificationService(db_session)

        notification = await service.notify_discussion_reply(
            user_id=sample_user.id,
            thread_title="Help with features",
            competition_slug="test-competition",
            thread_id=123,
            replier_name="Alice",
        )

        assert notification.type == NotificationType.DISCUSSION_REPLY
        assert "Alice" in notification.message
        assert "123" in notification.link


class TestNotificationAPI:
    """Tests for notification API endpoints."""

    @pytest.mark.asyncio
    async def test_list_notifications(self, client, auth_headers, db_session):
        """Test listing notifications."""
        # First get current user ID
        me_response = await client.get("/auth/me", headers=auth_headers)
        user_id = me_response.json()["id"]

        # Create some notifications directly
        from src.domain.services.notification import NotificationService
        service = NotificationService(db_session)

        for i in range(3):
            await service.create(
                user_id=user_id,
                notification_type=NotificationType.SYSTEM,
                title=f"Test {i}",
                message=f"Message {i}",
            )
        await db_session.commit()

        response = await client.get("/notifications", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        assert len(data["notifications"]) == 3
        assert data["unread_count"] == 3

    @pytest.mark.asyncio
    async def test_get_unread_count_endpoint(self, client, auth_headers, db_session):
        """Test getting unread count endpoint."""
        me_response = await client.get("/auth/me", headers=auth_headers)
        user_id = me_response.json()["id"]

        from src.domain.services.notification import NotificationService
        service = NotificationService(db_session)

        for i in range(2):
            await service.create(
                user_id=user_id,
                notification_type=NotificationType.SYSTEM,
                title=f"Test {i}",
                message=f"Message {i}",
            )
        await db_session.commit()

        response = await client.get("/notifications/unread-count", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["unread_count"] == 2

    @pytest.mark.asyncio
    async def test_mark_notification_as_read(self, client, auth_headers, db_session):
        """Test marking a single notification as read."""
        me_response = await client.get("/auth/me", headers=auth_headers)
        user_id = me_response.json()["id"]

        from src.domain.services.notification import NotificationService
        service = NotificationService(db_session)

        notification = await service.create(
            user_id=user_id,
            notification_type=NotificationType.SYSTEM,
            title="Test",
            message="Message",
        )
        await db_session.commit()

        response = await client.post(
            f"/notifications/{notification.id}/read",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        assert response.json()["marked_count"] == 1

    @pytest.mark.asyncio
    async def test_mark_all_as_read_endpoint(self, client, auth_headers, db_session):
        """Test marking all notifications as read."""
        me_response = await client.get("/auth/me", headers=auth_headers)
        user_id = me_response.json()["id"]

        from src.domain.services.notification import NotificationService
        service = NotificationService(db_session)

        for i in range(4):
            await service.create(
                user_id=user_id,
                notification_type=NotificationType.SYSTEM,
                title=f"Test {i}",
                message=f"Message {i}",
            )
        await db_session.commit()

        response = await client.post("/notifications/read-all", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["success"] is True
        assert response.json()["marked_count"] == 4

    @pytest.mark.asyncio
    async def test_unauthorized_access(self, client):
        """Test that notifications require authentication."""
        response = await client.get("/notifications")
        # Returns 403 Forbidden when no auth token provided
        assert response.status_code in (401, 403)
