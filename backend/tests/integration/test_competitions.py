"""Integration tests for competition endpoints."""

import pytest
from httpx import AsyncClient


class TestListCompetitions:
    """Tests for listing competitions."""

    async def test_list_empty(self, client: AsyncClient):
        """Should return empty list when no competitions exist."""
        response = await client.get("/competitions/")

        assert response.status_code == 200
        assert response.json() == []

    async def test_list_with_competitions(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Should return list of active competitions."""
        # Create a competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]

        # Activate the competition (list endpoint only returns active competitions)
        await client.patch(
            f"/competitions/{slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        response = await client.get("/competitions/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == sample_competition_data["title"]


class TestCreateCompetition:
    """Tests for creating competitions."""

    async def test_create_as_sponsor(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Sponsor should be able to create competition."""
        response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == sample_competition_data["title"]
        assert data["slug"] == "test-competition"
        assert data["status"] == "draft"

    async def test_create_as_participant_fails(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Regular participant should not be able to create competition."""
        response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=auth_headers,
        )

        assert response.status_code == 403

    async def test_create_without_auth_fails(
        self, client: AsyncClient, sample_competition_data: dict
    ):
        """Unauthenticated user should not be able to create competition."""
        response = await client.post("/competitions/", json=sample_competition_data)

        # FastAPI OAuth2PasswordBearer returns 403 when no token is provided
        assert response.status_code == 403

    async def test_create_generates_unique_slugs(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Should generate unique slugs for same-titled competitions."""
        # Create first competition
        response1 = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )

        # Create second with same title
        response2 = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )

        assert response1.status_code == 201
        assert response2.status_code == 201
        assert response1.json()["slug"] != response2.json()["slug"]


class TestGetCompetition:
    """Tests for getting competition details."""

    async def test_get_by_slug(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Should get competition by slug."""
        # Create competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]

        # Get competition
        response = await client.get(f"/competitions/{slug}")

        assert response.status_code == 200
        assert response.json()["title"] == sample_competition_data["title"]

    async def test_get_nonexistent_returns_404(self, client: AsyncClient):
        """Should return 404 for nonexistent competition."""
        response = await client.get("/competitions/nonexistent-slug")

        assert response.status_code == 404


class TestUpdateCompetition:
    """Tests for updating competitions."""

    async def test_update_as_owner(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Owner should be able to update their competition."""
        # Create competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]

        # Update competition
        response = await client.patch(
            f"/competitions/{slug}",
            json={"title": "Updated Title"},
            headers=sponsor_auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    async def test_update_as_non_owner_fails(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Non-owner should not be able to update competition."""
        # Create competition as sponsor
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]

        # Try to update as different user
        response = await client.patch(
            f"/competitions/{slug}",
            json={"title": "Hacked Title"},
            headers=auth_headers,
        )

        assert response.status_code == 403
