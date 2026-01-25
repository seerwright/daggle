"""Integration tests for discussion endpoints."""

import pytest
from httpx import AsyncClient


class TestListThreads:
    """Tests for listing discussion threads."""

    async def test_list_empty(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Should return empty list when no threads exist."""
        # Create a competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]

        response = await client.get(f"/competitions/{slug}/discussions")

        assert response.status_code == 200
        data = response.json()
        assert data["threads"] == []
        assert data["total"] == 0

    async def test_list_nonexistent_competition_returns_404(
        self, client: AsyncClient
    ):
        """Should return 404 for nonexistent competition."""
        response = await client.get("/competitions/nonexistent/discussions")

        assert response.status_code == 404


class TestCreateThread:
    """Tests for creating discussion threads."""

    async def test_create_as_sponsor(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Sponsor should be able to create threads in their competition."""
        # Create competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]

        # Create thread
        thread_data = {
            "title": "Welcome to the competition!",
            "content": "This is the welcome thread. Please read the rules.",
        }
        response = await client.post(
            f"/competitions/{slug}/discussions",
            json=thread_data,
            headers=sponsor_auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == thread_data["title"]
        assert data["content"] == thread_data["content"]
        assert data["is_pinned"] is False
        assert data["is_locked"] is False
        assert data["replies"] == []

    async def test_create_as_enrolled_user(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Enrolled user should be able to create threads."""
        # Create and activate competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]
        await client.patch(
            f"/competitions/{slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        # Enroll user
        await client.post(
            f"/competitions/{slug}/enroll",
            headers=auth_headers,
        )

        # Create thread
        thread_data = {
            "title": "Question about data",
            "content": "Can someone explain the target variable?",
        }
        response = await client.post(
            f"/competitions/{slug}/discussions",
            json=thread_data,
            headers=auth_headers,
        )

        assert response.status_code == 201

    async def test_create_as_unenrolled_user_fails(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Unenrolled user should not be able to create threads."""
        # Create competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]

        # Try to create thread without enrolling
        thread_data = {
            "title": "Question about data",
            "content": "Can someone explain the target variable?",
        }
        response = await client.post(
            f"/competitions/{slug}/discussions",
            json=thread_data,
            headers=auth_headers,
        )

        assert response.status_code == 403

    async def test_create_without_auth_fails(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Unauthenticated user should not be able to create threads."""
        # Create competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]

        # Try to create thread without auth
        thread_data = {
            "title": "Spam thread",
            "content": "This should not be allowed.",
        }
        response = await client.post(
            f"/competitions/{slug}/discussions",
            json=thread_data,
        )

        assert response.status_code == 403


class TestGetThread:
    """Tests for getting a thread with replies."""

    async def test_get_thread_with_replies(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Should return thread with its replies."""
        # Create and activate competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]
        await client.patch(
            f"/competitions/{slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        # Enroll user
        await client.post(
            f"/competitions/{slug}/enroll",
            headers=auth_headers,
        )

        # Create thread
        thread_response = await client.post(
            f"/competitions/{slug}/discussions",
            json={"title": "Test thread", "content": "Thread content here."},
            headers=sponsor_auth_headers,
        )
        thread_id = thread_response.json()["id"]

        # Add a reply
        await client.post(
            f"/competitions/{slug}/discussions/{thread_id}/replies",
            json={"content": "This is a reply!"},
            headers=auth_headers,
        )

        # Get thread
        response = await client.get(
            f"/competitions/{slug}/discussions/{thread_id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test thread"
        assert len(data["replies"]) == 1
        assert data["replies"][0]["content"] == "This is a reply!"

    async def test_get_nonexistent_thread_returns_404(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Should return 404 for nonexistent thread."""
        # Create competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]

        response = await client.get(f"/competitions/{slug}/discussions/99999")

        assert response.status_code == 404


class TestCreateReply:
    """Tests for creating replies."""

    async def test_create_reply(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Enrolled user should be able to reply to threads."""
        # Create and activate competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]
        await client.patch(
            f"/competitions/{slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        # Enroll user
        await client.post(
            f"/competitions/{slug}/enroll",
            headers=auth_headers,
        )

        # Create thread
        thread_response = await client.post(
            f"/competitions/{slug}/discussions",
            json={"title": "Test thread", "content": "Thread content here."},
            headers=sponsor_auth_headers,
        )
        thread_id = thread_response.json()["id"]

        # Create reply
        response = await client.post(
            f"/competitions/{slug}/discussions/{thread_id}/replies",
            json={"content": "Great question! Here's my answer."},
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["content"] == "Great question! Here's my answer."
        assert data["thread_id"] == thread_id

    async def test_create_reply_on_locked_thread_fails(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        auth_headers: dict,
        sample_competition_data: dict,
        db_session,
    ):
        """Should not allow replies on locked threads."""
        from src.domain.models.discussion import DiscussionThread

        # Create and activate competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]
        await client.patch(
            f"/competitions/{slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        # Enroll user
        await client.post(
            f"/competitions/{slug}/enroll",
            headers=auth_headers,
        )

        # Create thread
        thread_response = await client.post(
            f"/competitions/{slug}/discussions",
            json={"title": "Locked thread", "content": "This will be locked."},
            headers=sponsor_auth_headers,
        )
        thread_id = thread_response.json()["id"]

        # Lock the thread directly in DB
        thread = await db_session.get(DiscussionThread, thread_id)
        thread.is_locked = True
        await db_session.commit()

        # Try to reply
        response = await client.post(
            f"/competitions/{slug}/discussions/{thread_id}/replies",
            json={"content": "Trying to reply to locked thread."},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "locked" in response.json()["detail"].lower()
