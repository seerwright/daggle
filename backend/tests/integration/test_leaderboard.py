"""Integration tests for leaderboard endpoint."""

import pytest
from httpx import AsyncClient


class TestGetLeaderboard:
    """Tests for getting competition leaderboard."""

    async def test_leaderboard_empty(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Should return empty leaderboard when no submissions exist."""
        # Create competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]

        response = await client.get(f"/competitions/{slug}/leaderboard")

        assert response.status_code == 200
        data = response.json()
        assert data["entries"] == []
        assert data["total_participants"] == 0

    async def test_leaderboard_nonexistent_competition(self, client: AsyncClient):
        """Should return 404 for nonexistent competition."""
        response = await client.get("/competitions/nonexistent/leaderboard")

        assert response.status_code == 404

    async def test_leaderboard_returns_correct_structure(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Leaderboard should have correct response structure."""
        # Create competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]
        comp_id = create_response.json()["id"]

        response = await client.get(f"/competitions/{slug}/leaderboard")

        assert response.status_code == 200
        data = response.json()
        assert "competition_id" in data
        assert "competition_title" in data
        assert "entries" in data
        assert "total_participants" in data
        assert data["competition_id"] == comp_id

    async def test_leaderboard_unauthenticated_access(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        sample_competition_data: dict,
    ):
        """Leaderboard should be accessible without authentication."""
        # Create competition
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]

        # Access without auth headers
        response = await client.get(f"/competitions/{slug}/leaderboard")

        assert response.status_code == 200


class TestLeaderboardRanking:
    """Tests for leaderboard ranking logic."""

    async def test_ranking_higher_is_better(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        auth_headers: dict,
        sample_competition_data: dict,
        db_session,
    ):
        """For AUC-ROC metric, higher scores should rank better."""
        from src.domain.models.submission import Submission, SubmissionStatus
        from src.domain.models.user import User
        from src.common.security import hash_password
        from datetime import datetime, timezone

        # Create and activate competition with AUC-ROC metric
        sample_competition_data["evaluation_metric"] = "auc_roc"
        create_response = await client.post(
            "/competitions/",
            json=sample_competition_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]
        comp_id = create_response.json()["id"]

        await client.patch(
            f"/competitions/{slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        # Create test users with different scores
        user1 = User(
            email="user1@test.com",
            username="user1",
            hashed_password=hash_password("pass"),
            display_name="User One",
        )
        user2 = User(
            email="user2@test.com",
            username="user2",
            hashed_password=hash_password("pass"),
            display_name="User Two",
        )
        db_session.add_all([user1, user2])
        await db_session.flush()

        # User1 has score 0.9, User2 has score 0.8
        # Higher is better, so User1 should rank first
        sub1 = Submission(
            competition_id=comp_id,
            user_id=user1.id,
            file_path="/fake/path1.csv",
            file_name="sub1.csv",
            status=SubmissionStatus.SCORED,
            public_score=0.9,
        )
        sub2 = Submission(
            competition_id=comp_id,
            user_id=user2.id,
            file_path="/fake/path2.csv",
            file_name="sub2.csv",
            status=SubmissionStatus.SCORED,
            public_score=0.8,
        )
        db_session.add_all([sub1, sub2])
        await db_session.commit()

        response = await client.get(f"/competitions/{slug}/leaderboard")

        assert response.status_code == 200
        entries = response.json()["entries"]
        assert len(entries) == 2
        assert entries[0]["username"] == "user1"  # Higher score ranks first
        assert entries[0]["rank"] == 1
        assert entries[1]["username"] == "user2"
        assert entries[1]["rank"] == 2

    async def test_ranking_lower_is_better(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        db_session,
    ):
        """For RMSE metric, lower scores should rank better."""
        from src.domain.models.submission import Submission, SubmissionStatus
        from src.domain.models.user import User
        from src.common.security import hash_password
        from datetime import datetime, timedelta, timezone

        # Create competition with RMSE metric (lower is better)
        now = datetime.now(timezone.utc)
        comp_data = {
            "title": "RMSE Competition",
            "description": "Test competition with RMSE",
            "short_description": "RMSE metric test",
            "difficulty": "beginner",
            "evaluation_metric": "rmse",
            "start_date": (now - timedelta(days=1)).isoformat(),
            "end_date": (now + timedelta(days=30)).isoformat(),
        }
        create_response = await client.post(
            "/competitions/",
            json=comp_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]
        comp_id = create_response.json()["id"]

        await client.patch(
            f"/competitions/{slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        # Create test users
        user1 = User(
            email="rmse_user1@test.com",
            username="rmse_user1",
            hashed_password=hash_password("pass"),
            display_name="RMSE User One",
        )
        user2 = User(
            email="rmse_user2@test.com",
            username="rmse_user2",
            hashed_password=hash_password("pass"),
            display_name="RMSE User Two",
        )
        db_session.add_all([user1, user2])
        await db_session.flush()

        # User1 has RMSE 0.5, User2 has RMSE 0.3
        # Lower is better, so User2 should rank first
        sub1 = Submission(
            competition_id=comp_id,
            user_id=user1.id,
            file_path="/fake/rmse1.csv",
            file_name="rmse1.csv",
            status=SubmissionStatus.SCORED,
            public_score=0.5,
        )
        sub2 = Submission(
            competition_id=comp_id,
            user_id=user2.id,
            file_path="/fake/rmse2.csv",
            file_name="rmse2.csv",
            status=SubmissionStatus.SCORED,
            public_score=0.3,
        )
        db_session.add_all([sub1, sub2])
        await db_session.commit()

        response = await client.get(f"/competitions/{slug}/leaderboard")

        assert response.status_code == 200
        entries = response.json()["entries"]
        assert len(entries) == 2
        assert entries[0]["username"] == "rmse_user2"  # Lower score ranks first
        assert entries[0]["best_score"] == 0.3
        assert entries[1]["username"] == "rmse_user1"
        assert entries[1]["best_score"] == 0.5

    async def test_tiebreak_by_earlier_submission(
        self,
        client: AsyncClient,
        sponsor_auth_headers: dict,
        db_session,
    ):
        """When scores are tied, earlier submission should win."""
        from src.domain.models.submission import Submission, SubmissionStatus
        from src.domain.models.user import User
        from src.common.security import hash_password
        from datetime import datetime, timedelta, timezone

        now = datetime.now(timezone.utc)
        comp_data = {
            "title": "Tiebreak Competition",
            "description": "Test tiebreak logic",
            "short_description": "Tiebreak test competition",
            "difficulty": "beginner",
            "evaluation_metric": "auc_roc",
            "start_date": (now - timedelta(days=1)).isoformat(),
            "end_date": (now + timedelta(days=30)).isoformat(),
        }
        create_response = await client.post(
            "/competitions/",
            json=comp_data,
            headers=sponsor_auth_headers,
        )
        slug = create_response.json()["slug"]
        comp_id = create_response.json()["id"]

        await client.patch(
            f"/competitions/{slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        # Create test users
        early_user = User(
            email="early@test.com",
            username="early_user",
            hashed_password=hash_password("pass"),
            display_name="Early User",
        )
        late_user = User(
            email="late@test.com",
            username="late_user",
            hashed_password=hash_password("pass"),
            display_name="Late User",
        )
        db_session.add_all([early_user, late_user])
        await db_session.flush()

        # Both users have the same score
        # Early user submitted first, should rank higher
        early_time = now - timedelta(hours=2)
        late_time = now - timedelta(hours=1)

        sub_early = Submission(
            competition_id=comp_id,
            user_id=early_user.id,
            file_path="/fake/early.csv",
            file_name="early.csv",
            status=SubmissionStatus.SCORED,
            public_score=0.85,
            created_at=early_time,
        )
        sub_late = Submission(
            competition_id=comp_id,
            user_id=late_user.id,
            file_path="/fake/late.csv",
            file_name="late.csv",
            status=SubmissionStatus.SCORED,
            public_score=0.85,
            created_at=late_time,
        )
        db_session.add_all([sub_early, sub_late])
        await db_session.commit()

        response = await client.get(f"/competitions/{slug}/leaderboard")

        assert response.status_code == 200
        entries = response.json()["entries"]
        assert len(entries) == 2
        # Early user should rank first due to tiebreak
        assert entries[0]["username"] == "early_user"
        assert entries[1]["username"] == "late_user"
