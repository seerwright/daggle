"""Integration tests for user dashboard."""

from datetime import datetime, timedelta, timezone

import pytest

from src.domain.models.competition import Competition, CompetitionStatus, Difficulty
from src.domain.models.enrollment import Enrollment
from src.domain.models.notification import Notification, NotificationType
from src.domain.models.submission import Submission, SubmissionStatus
from src.domain.models.user import User, UserRole
from src.common.security import hash_password


class TestDashboardService:
    """Tests for the DashboardService."""

    @pytest.fixture
    async def dashboard_user(self, db_session):
        """Create a user for dashboard tests."""
        user = User(
            email="dashuser@example.com",
            username="dashuser",
            hashed_password=hash_password("password123"),
            display_name="Dashboard User",
            role=UserRole.PARTICIPANT,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest.fixture
    async def sponsor_user(self, db_session):
        """Create a sponsor user for competitions."""
        user = User(
            email="dashsponsor@example.com",
            username="dashsponsor",
            hashed_password=hash_password("password123"),
            display_name="Dashboard Sponsor",
            role=UserRole.SPONSOR,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest.fixture
    async def active_competition(self, db_session, sponsor_user):
        """Create an active competition."""
        now = datetime.now(timezone.utc)
        competition = Competition(
            title="Active Dashboard Test Competition",
            slug="active-dash-comp",
            description="An active competition for testing dashboard",
            short_description="Active dashboard test",
            difficulty=Difficulty.BEGINNER,
            evaluation_metric="auc_roc",
            start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=10),
            status=CompetitionStatus.ACTIVE,
            daily_submission_limit=5,
            sponsor_id=sponsor_user.id,
        )
        db_session.add(competition)
        await db_session.commit()
        await db_session.refresh(competition)
        return competition

    @pytest.fixture
    async def completed_competition(self, db_session, sponsor_user):
        """Create a completed competition."""
        now = datetime.now(timezone.utc)
        competition = Competition(
            title="Completed Dashboard Test Competition",
            slug="completed-dash-comp",
            description="A completed competition for testing dashboard",
            short_description="Completed dashboard test",
            difficulty=Difficulty.INTERMEDIATE,
            evaluation_metric="rmse",
            start_date=now - timedelta(days=30),
            end_date=now - timedelta(days=5),
            status=CompetitionStatus.COMPLETED,
            daily_submission_limit=5,
            sponsor_id=sponsor_user.id,
        )
        db_session.add(competition)
        await db_session.commit()
        await db_session.refresh(competition)
        return competition

    @pytest.mark.asyncio
    async def test_get_dashboard_empty(self, db_session, dashboard_user):
        """Test getting dashboard for user with no activity."""
        from src.domain.services.dashboard import DashboardService

        service = DashboardService(db_session)
        dashboard = await service.get_dashboard(dashboard_user)

        assert dashboard.user_id == dashboard_user.id
        assert dashboard.username == dashboard_user.username
        assert dashboard.display_name == dashboard_user.display_name
        assert dashboard.active_competitions == []
        assert dashboard.recent_submissions == []
        assert dashboard.notifications == []
        assert dashboard.stats.total_competitions == 0
        assert dashboard.stats.active_competitions == 0
        assert dashboard.stats.total_submissions == 0
        assert dashboard.stats.unread_notifications == 0

    @pytest.mark.asyncio
    async def test_get_dashboard_with_enrollment(
        self, db_session, dashboard_user, active_competition
    ):
        """Test dashboard with competition enrollment."""
        from src.domain.services.dashboard import DashboardService

        # Enroll user
        enrollment = Enrollment(
            user_id=dashboard_user.id,
            competition_id=active_competition.id,
        )
        db_session.add(enrollment)
        await db_session.commit()

        service = DashboardService(db_session)
        dashboard = await service.get_dashboard(dashboard_user)

        assert len(dashboard.active_competitions) == 1
        assert dashboard.stats.total_competitions == 1
        assert dashboard.stats.active_competitions == 1

        comp = dashboard.active_competitions[0]
        assert comp.id == active_competition.id
        assert comp.title == active_competition.title
        assert comp.slug == active_competition.slug
        assert comp.status == CompetitionStatus.ACTIVE
        assert comp.days_remaining is not None
        assert comp.days_remaining >= 9  # About 10 days remaining
        assert comp.user_submission_count == 0
        assert comp.user_best_score is None
        assert comp.user_rank is None

    @pytest.mark.asyncio
    async def test_get_dashboard_with_submissions(
        self, db_session, dashboard_user, active_competition
    ):
        """Test dashboard with submissions."""
        from src.domain.services.dashboard import DashboardService

        # Enroll user
        enrollment = Enrollment(
            user_id=dashboard_user.id,
            competition_id=active_competition.id,
        )
        db_session.add(enrollment)

        # Add submissions
        for i, score in enumerate([0.75, 0.82, 0.79]):
            submission = Submission(
                user_id=dashboard_user.id,
                competition_id=active_competition.id,
                file_path=f"test/file_{i}.csv",
                file_name=f"file_{i}.csv",
                status=SubmissionStatus.SCORED,
                public_score=score,
                private_score=score,
                scored_at=datetime.now(timezone.utc),
            )
            db_session.add(submission)

        await db_session.commit()

        service = DashboardService(db_session)
        dashboard = await service.get_dashboard(dashboard_user)

        # Check competition stats
        comp = dashboard.active_competitions[0]
        assert comp.user_submission_count == 3
        assert comp.user_best_score == 0.82  # Highest for higher-is-better
        assert comp.user_rank == 1  # Only participant
        assert comp.total_participants == 1

        # Check recent submissions
        assert len(dashboard.recent_submissions) == 3
        assert dashboard.stats.total_submissions == 3

        # Most recent first
        for sub in dashboard.recent_submissions:
            assert sub.competition_id == active_competition.id
            assert sub.competition_title == active_competition.title
            assert sub.status == SubmissionStatus.SCORED

    @pytest.mark.asyncio
    async def test_get_dashboard_with_notifications(
        self, db_session, dashboard_user, active_competition
    ):
        """Test dashboard with notifications."""
        from src.domain.services.dashboard import DashboardService

        # Add notifications
        for i in range(5):
            notification = Notification(
                user_id=dashboard_user.id,
                type=NotificationType.SUBMISSION_SCORED,
                title=f"Notification {i}",
                message=f"Message {i}",
                is_read=(i < 2),  # First 2 read, last 3 unread
            )
            db_session.add(notification)
        await db_session.commit()

        service = DashboardService(db_session)
        dashboard = await service.get_dashboard(dashboard_user)

        assert len(dashboard.notifications) == 5
        assert dashboard.stats.unread_notifications == 3

        # Check notification structure
        notif = dashboard.notifications[0]
        assert notif.type == "submission_scored"
        assert notif.title.startswith("Notification")

    @pytest.mark.asyncio
    async def test_dashboard_prioritizes_active_competitions(
        self, db_session, dashboard_user, active_competition, completed_competition
    ):
        """Test that active competitions are prioritized over completed ones."""
        from src.domain.services.dashboard import DashboardService

        # Enroll in both
        for comp in [active_competition, completed_competition]:
            enrollment = Enrollment(
                user_id=dashboard_user.id,
                competition_id=comp.id,
            )
            db_session.add(enrollment)
        await db_session.commit()

        service = DashboardService(db_session)
        dashboard = await service.get_dashboard(dashboard_user)

        assert len(dashboard.active_competitions) == 2
        assert dashboard.stats.total_competitions == 2
        assert dashboard.stats.active_competitions == 1

        # Active should be first
        assert dashboard.active_competitions[0].status == CompetitionStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_get_stats_only(self, db_session, dashboard_user, active_competition):
        """Test getting just stats without full dashboard."""
        from src.domain.services.dashboard import DashboardService

        # Enroll and add data
        enrollment = Enrollment(
            user_id=dashboard_user.id,
            competition_id=active_competition.id,
        )
        db_session.add(enrollment)

        submission = Submission(
            user_id=dashboard_user.id,
            competition_id=active_competition.id,
            file_path="test/file.csv",
            file_name="file.csv",
            status=SubmissionStatus.SCORED,
            public_score=0.85,
            private_score=0.85,
            scored_at=datetime.now(timezone.utc),
        )
        db_session.add(submission)

        notification = Notification(
            user_id=dashboard_user.id,
            type=NotificationType.SUBMISSION_SCORED,
            title="Score notification",
            message="Your submission scored 0.85",
            is_read=False,
        )
        db_session.add(notification)
        await db_session.commit()

        service = DashboardService(db_session)
        stats = await service._get_stats(dashboard_user.id)

        assert stats.total_competitions == 1
        assert stats.active_competitions == 1
        assert stats.total_submissions == 1
        assert stats.unread_notifications == 1


class TestDashboardAPI:
    """Tests for dashboard API endpoints."""

    @pytest.mark.asyncio
    async def test_get_dashboard_endpoint(self, client, auth_headers):
        """Test getting dashboard via API."""
        response = await client.get("/dashboard", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert "user_id" in data
        assert "username" in data
        assert "display_name" in data
        assert "active_competitions" in data
        assert "recent_submissions" in data
        assert "notifications" in data
        assert "stats" in data

        stats = data["stats"]
        assert "total_competitions" in stats
        assert "active_competitions" in stats
        assert "total_submissions" in stats
        assert "unread_notifications" in stats

    @pytest.mark.asyncio
    async def test_get_dashboard_stats_endpoint(self, client, auth_headers):
        """Test getting dashboard stats via API."""
        response = await client.get("/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert "total_competitions" in data
        assert "active_competitions" in data
        assert "total_submissions" in data
        assert "unread_notifications" in data

    @pytest.mark.asyncio
    async def test_dashboard_requires_auth(self, client):
        """Test that dashboard requires authentication."""
        response = await client.get("/dashboard")
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_dashboard_stats_requires_auth(self, client):
        """Test that dashboard stats requires authentication."""
        response = await client.get("/dashboard/stats")
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_dashboard_with_real_data(
        self, client, auth_headers, sponsor_auth_headers, db_session
    ):
        """Test dashboard with actual competition and submission data."""
        # Get user info
        me_response = await client.get("/auth/me", headers=auth_headers)
        user_id = me_response.json()["id"]

        # Create competition as sponsor
        comp_data = {
            "title": "Dashboard API Test Competition",
            "description": "Testing dashboard with real data",
            "short_description": "Dashboard API test",
            "difficulty": "beginner",
            "evaluation_metric": "auc_roc",
            "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        }
        comp_response = await client.post(
            "/competitions/",
            json=comp_data,
            headers=sponsor_auth_headers,
        )
        assert comp_response.status_code == 201
        comp_slug = comp_response.json()["slug"]

        # Activate competition
        activate_response = await client.patch(
            f"/competitions/{comp_slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )
        assert activate_response.status_code == 200

        # Enroll in competition
        enroll_response = await client.post(
            f"/competitions/{comp_slug}/enroll",
            headers=auth_headers,
        )
        assert enroll_response.status_code == 201

        # Check dashboard
        dashboard_response = await client.get("/dashboard", headers=auth_headers)
        assert dashboard_response.status_code == 200

        dashboard = dashboard_response.json()
        assert dashboard["stats"]["total_competitions"] >= 1
        assert dashboard["stats"]["active_competitions"] >= 1

        # Find our competition
        comp = next(
            (c for c in dashboard["active_competitions"] if c["slug"] == comp_slug),
            None,
        )
        assert comp is not None
        assert comp["title"] == "Dashboard API Test Competition"
        assert comp["days_remaining"] is not None
        assert comp["days_remaining"] >= 29
