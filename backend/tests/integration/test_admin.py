"""Integration tests for admin API endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.user import User, UserRole
from src.domain.models.competition import Competition, CompetitionStatus, Difficulty
from src.domain.models.discussion import DiscussionThread
from src.common.security import hash_password


@pytest.fixture
async def admin_auth_headers(
    client: AsyncClient, db_session: AsyncSession
) -> dict[str, str]:
    """Get authentication headers for an admin user."""
    # Create admin user directly in DB
    admin = User(
        email="admin@example.com",
        username="admin",
        hashed_password=hash_password("password123"),
        display_name="Admin User",
        role=UserRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()

    # Login
    response = await client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def regular_auth_headers(
    client: AsyncClient, db_session: AsyncSession
) -> dict[str, str]:
    """Get authentication headers for a regular user."""
    # Create regular user directly in DB
    user = User(
        email="regular@example.com",
        username="regular",
        hashed_password=hash_password("password123"),
        display_name="Regular User",
        role=UserRole.PARTICIPANT,
    )
    db_session.add(user)
    await db_session.commit()

    # Login
    response = await client.post(
        "/auth/login",
        json={"email": "regular@example.com", "password": "password123"},
    )
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


class TestPlatformStats:
    """Tests for platform statistics endpoint."""

    async def test_get_platform_stats_as_admin(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        """Admin can retrieve platform statistics."""
        response = await client.get("/admin/stats", headers=admin_auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "active_users_last_30_days" in data
        assert "total_competitions" in data
        assert "active_competitions" in data
        assert "total_submissions" in data
        assert "submissions_last_7_days" in data
        assert "total_enrollments" in data

    async def test_get_platform_stats_as_regular_user_forbidden(
        self, client: AsyncClient, regular_auth_headers: dict
    ):
        """Regular user cannot access platform statistics."""
        response = await client.get("/admin/stats", headers=regular_auth_headers)

        assert response.status_code == 403
        assert "Admin access required" in response.json()["detail"]

    async def test_get_platform_stats_unauthenticated(self, client: AsyncClient):
        """Unauthenticated request returns 403."""
        response = await client.get("/admin/stats")

        assert response.status_code == 403


class TestUserManagement:
    """Tests for user management endpoints."""

    async def test_list_users_as_admin(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        """Admin can list all users."""
        response = await client.get("/admin/users", headers=admin_auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # At least the admin user exists
        assert len(data) >= 1

    async def test_list_users_with_pagination(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        """Admin can paginate user list."""
        response = await client.get(
            "/admin/users", params={"skip": 0, "limit": 10}, headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_list_users_with_search(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        """Admin can search users."""
        response = await client.get(
            "/admin/users", params={"search": "admin"}, headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_list_users_as_regular_user_forbidden(
        self, client: AsyncClient, regular_auth_headers: dict
    ):
        """Regular user cannot list users."""
        response = await client.get("/admin/users", headers=regular_auth_headers)

        assert response.status_code == 403

    async def test_get_user_details(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        """Admin can get user details."""
        # Create a target user
        user = User(
            email="target@example.com",
            username="targetuser",
            hashed_password=hash_password("password123"),
            display_name="Target User",
            role=UserRole.PARTICIPANT,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        response = await client.get(
            f"/admin/users/{user.id}", headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == user.id
        assert data["email"] == user.email
        assert data["username"] == user.username

    async def test_get_nonexistent_user(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        """Getting nonexistent user returns 404."""
        response = await client.get("/admin/users/99999", headers=admin_auth_headers)

        assert response.status_code == 404


class TestUserSuspension:
    """Tests for user suspension/reactivation."""

    async def test_suspend_user(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        """Admin can suspend a user."""
        # Create target user
        user = User(
            email="suspend@example.com",
            username="suspendme",
            hashed_password=hash_password("password123"),
            display_name="Suspend Me",
            role=UserRole.PARTICIPANT,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        response = await client.post(
            f"/admin/users/{user.id}/suspend", headers=admin_auth_headers
        )

        assert response.status_code == 200
        assert "suspended successfully" in response.json()["message"]

    async def test_reactivate_user(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        """Admin can reactivate a suspended user."""
        # Create suspended user
        user = User(
            email="reactivate@example.com",
            username="reactivateme",
            hashed_password=hash_password("password123"),
            display_name="Reactivate Me",
            role=UserRole.PARTICIPANT,
            is_active=False,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        response = await client.post(
            f"/admin/users/{user.id}/reactivate", headers=admin_auth_headers
        )

        assert response.status_code == 200
        assert "reactivated successfully" in response.json()["message"]

    async def test_cannot_suspend_self(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        """Admin cannot suspend themselves."""
        # Get the admin user
        from sqlalchemy import select
        stmt = select(User).where(User.email == "admin@example.com")
        result = await db_session.execute(stmt)
        admin = result.scalar_one()

        response = await client.post(
            f"/admin/users/{admin.id}/suspend", headers=admin_auth_headers
        )

        assert response.status_code == 400
        assert "Cannot suspend yourself" in response.json()["detail"]

    async def test_cannot_suspend_other_admin(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        """Admin cannot suspend another admin."""
        # Create another admin
        other_admin = User(
            email="otheradmin@example.com",
            username="otheradmin",
            hashed_password=hash_password("password123"),
            display_name="Other Admin",
            role=UserRole.ADMIN,
        )
        db_session.add(other_admin)
        await db_session.commit()
        await db_session.refresh(other_admin)

        response = await client.post(
            f"/admin/users/{other_admin.id}/suspend", headers=admin_auth_headers
        )

        assert response.status_code == 400
        assert "Cannot suspend other admins" in response.json()["detail"]


class TestRoleManagement:
    """Tests for user role management."""

    async def test_change_user_role(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        """Admin can change user role."""
        # Create target user
        user = User(
            email="changerole@example.com",
            username="changerole",
            hashed_password=hash_password("password123"),
            display_name="Change Role",
            role=UserRole.PARTICIPANT,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        response = await client.patch(
            f"/admin/users/{user.id}/role",
            json={"role": "sponsor"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        assert "role changed to sponsor" in response.json()["message"]

    async def test_cannot_change_own_role(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        """Admin cannot change their own role."""
        # Get the admin user
        from sqlalchemy import select
        stmt = select(User).where(User.email == "admin@example.com")
        result = await db_session.execute(stmt)
        admin = result.scalar_one()

        response = await client.patch(
            f"/admin/users/{admin.id}/role",
            json={"role": "participant"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 400
        assert "Cannot change your own role" in response.json()["detail"]


class TestCompetitionManagement:
    """Tests for competition management endpoints."""

    async def test_list_all_competitions(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        """Admin can list all competitions including private ones."""
        from datetime import datetime, timedelta, timezone

        # Get admin user as sponsor
        from sqlalchemy import select
        stmt = select(User).where(User.email == "admin@example.com")
        result = await db_session.execute(stmt)
        sponsor = result.scalar_one()

        now = datetime.now(timezone.utc)
        # Create a private competition
        comp = Competition(
            title="Secret Competition",
            slug="secret-competition",
            description="A secret competition",
            short_description="Secret",
            difficulty=Difficulty.INTERMEDIATE,
            evaluation_metric="auc_roc",
            sponsor_id=sponsor.id,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=30),
            is_public=False,
            status=CompetitionStatus.ACTIVE,
        )
        db_session.add(comp)
        await db_session.commit()

        response = await client.get("/admin/competitions", headers=admin_auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_list_competitions_with_status_filter(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        """Admin can filter competitions by status."""
        response = await client.get(
            "/admin/competitions",
            params={"status": "active"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestThreadModeration:
    """Tests for discussion thread moderation."""

    async def test_lock_thread(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        """Admin can lock a discussion thread."""
        from datetime import datetime, timedelta, timezone

        # Get admin user
        from sqlalchemy import select
        stmt = select(User).where(User.email == "admin@example.com")
        result = await db_session.execute(stmt)
        admin = result.scalar_one()

        now = datetime.now(timezone.utc)
        # Create a competition
        comp = Competition(
            title="Thread Test Competition",
            slug="thread-test-comp",
            description="A test competition",
            short_description="Test",
            difficulty=Difficulty.BEGINNER,
            evaluation_metric="auc_roc",
            sponsor_id=admin.id,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=30),
            is_public=True,
            status=CompetitionStatus.ACTIVE,
        )
        db_session.add(comp)
        await db_session.flush()

        thread = DiscussionThread(
            competition_id=comp.id,
            author_id=admin.id,
            title="Test Thread",
            content="Test content",
        )
        db_session.add(thread)
        await db_session.commit()
        await db_session.refresh(thread)

        response = await client.post(
            f"/admin/threads/{thread.id}/lock", headers=admin_auth_headers
        )

        assert response.status_code == 200
        assert "locked successfully" in response.json()["message"]

    async def test_unlock_thread(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        """Admin can unlock a discussion thread."""
        from datetime import datetime, timedelta, timezone

        # Get admin user
        from sqlalchemy import select
        stmt = select(User).where(User.email == "admin@example.com")
        result = await db_session.execute(stmt)
        admin = result.scalar_one()

        now = datetime.now(timezone.utc)
        # Create a competition
        comp = Competition(
            title="Unlock Thread Test Competition",
            slug="unlock-thread-test-comp",
            description="A test competition",
            short_description="Test",
            difficulty=Difficulty.BEGINNER,
            evaluation_metric="auc_roc",
            sponsor_id=admin.id,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=30),
            is_public=True,
            status=CompetitionStatus.ACTIVE,
        )
        db_session.add(comp)
        await db_session.flush()

        thread = DiscussionThread(
            competition_id=comp.id,
            author_id=admin.id,
            title="Locked Thread",
            content="Test content",
            is_locked=True,
        )
        db_session.add(thread)
        await db_session.commit()
        await db_session.refresh(thread)

        response = await client.post(
            f"/admin/threads/{thread.id}/unlock", headers=admin_auth_headers
        )

        assert response.status_code == 200
        assert "unlocked successfully" in response.json()["message"]

    async def test_pin_thread(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        """Admin can pin a discussion thread."""
        from datetime import datetime, timedelta, timezone

        # Get admin user
        from sqlalchemy import select
        stmt = select(User).where(User.email == "admin@example.com")
        result = await db_session.execute(stmt)
        admin = result.scalar_one()

        now = datetime.now(timezone.utc)
        # Create a competition
        comp = Competition(
            title="Pin Thread Test Competition",
            slug="pin-thread-test-comp",
            description="A test competition",
            short_description="Test",
            difficulty=Difficulty.BEGINNER,
            evaluation_metric="auc_roc",
            sponsor_id=admin.id,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=30),
            is_public=True,
            status=CompetitionStatus.ACTIVE,
        )
        db_session.add(comp)
        await db_session.flush()

        thread = DiscussionThread(
            competition_id=comp.id,
            author_id=admin.id,
            title="Important Thread",
            content="Test content",
        )
        db_session.add(thread)
        await db_session.commit()
        await db_session.refresh(thread)

        response = await client.post(
            f"/admin/threads/{thread.id}/pin", headers=admin_auth_headers
        )

        assert response.status_code == 200
        assert "pinned successfully" in response.json()["message"]

    async def test_unpin_thread(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        """Admin can unpin a discussion thread."""
        from datetime import datetime, timedelta, timezone

        # Get admin user
        from sqlalchemy import select
        stmt = select(User).where(User.email == "admin@example.com")
        result = await db_session.execute(stmt)
        admin = result.scalar_one()

        now = datetime.now(timezone.utc)
        # Create a competition
        comp = Competition(
            title="Unpin Thread Test Competition",
            slug="unpin-thread-test-comp",
            description="A test competition",
            short_description="Test",
            difficulty=Difficulty.BEGINNER,
            evaluation_metric="auc_roc",
            sponsor_id=admin.id,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=30),
            is_public=True,
            status=CompetitionStatus.ACTIVE,
        )
        db_session.add(comp)
        await db_session.flush()

        thread = DiscussionThread(
            competition_id=comp.id,
            author_id=admin.id,
            title="Pinned Thread",
            content="Test content",
            is_pinned=True,
        )
        db_session.add(thread)
        await db_session.commit()
        await db_session.refresh(thread)

        response = await client.post(
            f"/admin/threads/{thread.id}/unpin", headers=admin_auth_headers
        )

        assert response.status_code == 200
        assert "unpinned successfully" in response.json()["message"]

    async def test_lock_nonexistent_thread(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        """Locking nonexistent thread returns error."""
        response = await client.post(
            "/admin/threads/99999/lock", headers=admin_auth_headers
        )

        assert response.status_code == 400
        assert "Thread not found" in response.json()["detail"]
