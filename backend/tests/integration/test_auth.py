"""Integration tests for authentication endpoints."""

import pytest
from httpx import AsyncClient


class TestRegister:
    """Tests for user registration."""

    async def test_register_success(self, client: AsyncClient, sample_user_data):
        """Should successfully register a new user."""
        response = await client.post("/auth/register", json=sample_user_data)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == sample_user_data["email"]
        assert data["username"] == sample_user_data["username"]
        assert "password" not in data
        assert "hashed_password" not in data

    async def test_register_duplicate_email_fails(
        self, client: AsyncClient, sample_user_data
    ):
        """Should reject duplicate email."""
        await client.post("/auth/register", json=sample_user_data)

        response = await client.post("/auth/register", json=sample_user_data)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    async def test_register_duplicate_username_fails(
        self, client: AsyncClient, sample_user_data
    ):
        """Should reject duplicate username."""
        await client.post("/auth/register", json=sample_user_data)

        # Same username, different email
        sample_user_data["email"] = "different@example.com"
        response = await client.post("/auth/register", json=sample_user_data)

        assert response.status_code == 400
        assert "username" in response.json()["detail"].lower()

    async def test_register_invalid_email_fails(
        self, client: AsyncClient, sample_user_data
    ):
        """Should reject invalid email format."""
        sample_user_data["email"] = "not-an-email"

        response = await client.post("/auth/register", json=sample_user_data)

        assert response.status_code == 422


class TestLogin:
    """Tests for user login."""

    async def test_login_success(self, client: AsyncClient, sample_user_data):
        """Should successfully login and return token."""
        # Register first
        await client.post("/auth/register", json=sample_user_data)

        # Login
        response = await client.post(
            "/auth/login",
            json={
                "email": sample_user_data["email"],
                "password": sample_user_data["password"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password_fails(
        self, client: AsyncClient, sample_user_data
    ):
        """Should reject wrong password."""
        await client.post("/auth/register", json=sample_user_data)

        response = await client.post(
            "/auth/login",
            json={
                "email": sample_user_data["email"],
                "password": "wrongpassword",
            },
        )

        assert response.status_code == 401

    async def test_login_nonexistent_user_fails(self, client: AsyncClient):
        """Should reject login for nonexistent user."""
        response = await client.post(
            "/auth/login",
            json={
                "email": "nobody@example.com",
                "password": "password123",
            },
        )

        assert response.status_code == 401


class TestMe:
    """Tests for current user endpoint."""

    async def test_me_with_valid_token(self, client: AsyncClient, sample_user_data):
        """Should return current user info with valid token."""
        # Register and login
        await client.post("/auth/register", json=sample_user_data)
        login_response = await client.post(
            "/auth/login",
            json={
                "email": sample_user_data["email"],
                "password": sample_user_data["password"],
            },
        )
        token = login_response.json()["access_token"]

        # Get current user
        response = await client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == sample_user_data["email"]
        assert data["username"] == sample_user_data["username"]

    async def test_me_without_token_fails(self, client: AsyncClient):
        """Should reject request without token."""
        response = await client.get("/auth/me")

        # FastAPI OAuth2PasswordBearer returns 403 when no token is provided
        assert response.status_code == 403

    async def test_me_with_invalid_token_fails(self, client: AsyncClient):
        """Should reject request with invalid token."""
        response = await client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid_token"},
        )

        assert response.status_code == 401
