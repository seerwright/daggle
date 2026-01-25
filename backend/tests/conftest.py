"""Pytest fixtures for testing."""

import asyncio
from collections.abc import AsyncGenerator, Generator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.domain.models.base import Base
from src.infrastructure.database import get_db
from src.main import app


# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def db_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Enable foreign keys for SQLite
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        yield session


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client with database override."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def sample_user_data() -> dict[str, Any]:
    """Sample user registration data."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "password123",
        "display_name": "Test User",
    }


@pytest.fixture
def sample_competition_data() -> dict[str, Any]:
    """Sample competition creation data."""
    return {
        "title": "Test Competition",
        "description": "A test competition for unit testing",
        "short_description": "Test competition",
        "difficulty": "beginner",
        "evaluation_metric": "auc_roc",
        "start_date": "2025-01-01T00:00:00Z",
        "end_date": "2025-12-31T23:59:59Z",
    }


@pytest.fixture
async def auth_headers(client: AsyncClient, sample_user_data) -> dict[str, str]:
    """Get authentication headers for a registered user."""
    # Register user
    await client.post("/auth/register", json=sample_user_data)

    # Login
    response = await client.post(
        "/auth/login",
        json={
            "email": sample_user_data["email"],
            "password": sample_user_data["password"],
        },
    )
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def sponsor_auth_headers(
    client: AsyncClient, db_session: AsyncSession
) -> dict[str, str]:
    """Get authentication headers for a sponsor user."""
    from src.domain.models.user import User, UserRole
    from src.common.security import hash_password

    # Create sponsor user directly in DB
    sponsor = User(
        email="sponsor@example.com",
        username="sponsor",
        hashed_password=hash_password("password123"),
        display_name="Sponsor User",
        role=UserRole.SPONSOR,
    )
    db_session.add(sponsor)
    await db_session.commit()

    # Login
    response = await client.post(
        "/auth/login",
        json={"email": "sponsor@example.com", "password": "password123"},
    )
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}
