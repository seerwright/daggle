"""Integration tests for user profiles."""

from datetime import datetime, timedelta, timezone

import pytest

from src.domain.models.competition import Competition, CompetitionStatus, Difficulty
from src.domain.models.enrollment import Enrollment
from src.domain.models.submission import Submission, SubmissionStatus
from src.domain.models.user import User, UserRole
from src.common.security import hash_password


class TestProfileService:
    """Tests for the ProfileService."""

    @pytest.fixture
    async def sample_user(self, db_session):
        """Create a sample user."""
        user = User(
            email="profileuser@example.com",
            username="profileuser",
            hashed_password=hash_password("password123"),
            display_name="Profile Test User",
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
            email="profilesponsor@example.com",
            username="profilesponsor",
            hashed_password=hash_password("password123"),
            display_name="Profile Sponsor",
            role=UserRole.SPONSOR,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest.fixture
    async def sample_competition(self, db_session, sponsor_user):
        """Create a sample competition."""
        now = datetime.now(timezone.utc)
        competition = Competition(
            title="Profile Test Competition",
            slug="profile-test-comp",
            description="A competition for testing profiles",
            short_description="Profile test competition",
            difficulty=Difficulty.BEGINNER,
            evaluation_metric="auc_roc",
            start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=20),
            status=CompetitionStatus.ACTIVE,
            daily_submission_limit=5,
            sponsor_id=sponsor_user.id,
        )
        db_session.add(competition)
        await db_session.commit()
        await db_session.refresh(competition)
        return competition

    @pytest.mark.asyncio
    async def test_get_profile_basic(self, db_session, sample_user):
        """Test getting basic profile without participations."""
        from src.domain.services.profile import ProfileService

        service = ProfileService(db_session)
        profile = await service.get_profile(sample_user.username)

        assert profile is not None
        assert profile.username == sample_user.username
        assert profile.display_name == sample_user.display_name
        assert profile.competitions_entered == 0
        assert profile.total_submissions == 0
        assert profile.best_rank is None
        assert profile.participations == []

    @pytest.mark.asyncio
    async def test_get_profile_nonexistent_user(self, db_session):
        """Test getting profile for nonexistent user."""
        from src.domain.services.profile import ProfileService

        service = ProfileService(db_session)
        profile = await service.get_profile("nonexistent_user")

        assert profile is None

    @pytest.mark.asyncio
    async def test_get_profile_with_enrollment(
        self, db_session, sample_user, sample_competition
    ):
        """Test getting profile with competition enrollment."""
        from src.domain.services.profile import ProfileService

        # Enroll user in competition
        enrollment = Enrollment(
            user_id=sample_user.id,
            competition_id=sample_competition.id,
        )
        db_session.add(enrollment)
        await db_session.commit()

        service = ProfileService(db_session)
        profile = await service.get_profile(sample_user.username)

        assert profile.competitions_entered == 1
        assert len(profile.participations) == 1

        participation = profile.participations[0]
        assert participation.competition_id == sample_competition.id
        assert participation.competition_title == sample_competition.title
        assert participation.submission_count == 0
        assert participation.best_score is None
        assert participation.rank is None

    @pytest.mark.asyncio
    async def test_get_profile_with_submissions(
        self, db_session, sample_user, sample_competition
    ):
        """Test getting profile with submissions."""
        from src.domain.services.profile import ProfileService

        # Enroll user
        enrollment = Enrollment(
            user_id=sample_user.id,
            competition_id=sample_competition.id,
        )
        db_session.add(enrollment)

        # Add submissions
        for i, score in enumerate([0.75, 0.82, 0.79]):
            submission = Submission(
                user_id=sample_user.id,
                competition_id=sample_competition.id,
                file_path=f"test/file_{i}.csv",
                file_name=f"file_{i}.csv",
                status=SubmissionStatus.SCORED,
                public_score=score,
                private_score=score,
                scored_at=datetime.now(timezone.utc),
            )
            db_session.add(submission)

        await db_session.commit()

        service = ProfileService(db_session)
        profile = await service.get_profile(sample_user.username)

        assert profile.total_submissions == 3

        participation = profile.participations[0]
        assert participation.submission_count == 3
        assert participation.best_score == 0.82  # Highest for higher-is-better
        assert participation.rank == 1  # Only participant
        assert participation.total_participants == 1

    @pytest.mark.asyncio
    async def test_get_profile_rank_calculation(
        self, db_session, sample_user, sponsor_user, sample_competition
    ):
        """Test that rank is calculated correctly with multiple users."""
        from src.domain.services.profile import ProfileService

        # Create another participant
        other_user = User(
            email="otheruser@example.com",
            username="otheruser",
            hashed_password=hash_password("password123"),
            display_name="Other User",
            role=UserRole.PARTICIPANT,
        )
        db_session.add(other_user)
        await db_session.commit()

        # Enroll both users
        for user in [sample_user, other_user]:
            enrollment = Enrollment(
                user_id=user.id,
                competition_id=sample_competition.id,
            )
            db_session.add(enrollment)

        # Add submissions - other_user has better score
        submission1 = Submission(
            user_id=sample_user.id,
            competition_id=sample_competition.id,
            file_path="test/file1.csv",
            file_name="file1.csv",
            status=SubmissionStatus.SCORED,
            public_score=0.75,
            private_score=0.75,
            scored_at=datetime.now(timezone.utc),
        )
        submission2 = Submission(
            user_id=other_user.id,
            competition_id=sample_competition.id,
            file_path="test/file2.csv",
            file_name="file2.csv",
            status=SubmissionStatus.SCORED,
            public_score=0.90,  # Better score
            private_score=0.90,
            scored_at=datetime.now(timezone.utc),
        )
        db_session.add_all([submission1, submission2])
        await db_session.commit()

        service = ProfileService(db_session)

        # Check sample_user's rank (should be 2)
        profile = await service.get_profile(sample_user.username)
        participation = profile.participations[0]
        assert participation.rank == 2
        assert participation.total_participants == 2

        # Check other_user's rank (should be 1)
        other_profile = await service.get_profile(other_user.username)
        other_participation = other_profile.participations[0]
        assert other_participation.rank == 1

    @pytest.mark.asyncio
    async def test_best_rank_across_competitions(
        self, db_session, sample_user, sponsor_user
    ):
        """Test that best_rank is the best across all competitions."""
        from src.domain.services.profile import ProfileService

        now = datetime.now(timezone.utc)

        # Create two competitions
        comp1 = Competition(
            title="Competition 1",
            slug="comp-1",
            description="First competition",
            short_description="First test comp",
            difficulty=Difficulty.BEGINNER,
            evaluation_metric="auc_roc",
            start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=20),
            status=CompetitionStatus.ACTIVE,
            daily_submission_limit=5,
            sponsor_id=sponsor_user.id,
        )
        comp2 = Competition(
            title="Competition 2",
            slug="comp-2",
            description="Second competition",
            short_description="Second test comp",
            difficulty=Difficulty.INTERMEDIATE,
            evaluation_metric="auc_roc",
            start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=25),
            status=CompetitionStatus.ACTIVE,
            daily_submission_limit=5,
            sponsor_id=sponsor_user.id,
        )
        db_session.add_all([comp1, comp2])
        await db_session.commit()

        # Enroll in both
        for comp in [comp1, comp2]:
            enrollment = Enrollment(
                user_id=sample_user.id,
                competition_id=comp.id,
            )
            db_session.add(enrollment)

        # Submit to both (rank 1 in comp1, but other users in comp2)
        submission1 = Submission(
            user_id=sample_user.id,
            competition_id=comp1.id,
            file_path="test/file1.csv",
            file_name="file1.csv",
            status=SubmissionStatus.SCORED,
            public_score=0.80,
            private_score=0.80,
            scored_at=datetime.now(timezone.utc),
        )
        db_session.add(submission1)
        await db_session.commit()

        service = ProfileService(db_session)
        profile = await service.get_profile(sample_user.username)

        # Best rank should be 1 (from comp1 where user is only participant)
        assert profile.best_rank == 1


class TestProfileAPI:
    """Tests for profile API endpoints."""

    @pytest.mark.asyncio
    async def test_get_profile_endpoint(self, client, auth_headers):
        """Test getting profile via API."""
        # First register and get the username
        me_response = await client.get("/auth/me", headers=auth_headers)
        username = me_response.json()["username"]

        response = await client.get(f"/users/{username}")
        assert response.status_code == 200

        data = response.json()
        assert data["username"] == username
        assert "display_name" in data
        assert "joined_at" in data
        assert "competitions_entered" in data
        assert "participations" in data

    @pytest.mark.asyncio
    async def test_get_profile_not_found(self, client):
        """Test getting profile for nonexistent user."""
        response = await client.get("/users/nonexistent_user_xyz")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_profile_stats_endpoint(self, client, auth_headers):
        """Test getting profile stats via API."""
        me_response = await client.get("/auth/me", headers=auth_headers)
        username = me_response.json()["username"]

        response = await client.get(f"/users/{username}/stats")
        assert response.status_code == 200

        data = response.json()
        assert "competitions_entered" in data
        assert "total_submissions" in data
        assert "best_rank" in data
        assert "active_competitions" in data

    @pytest.mark.asyncio
    async def test_profile_is_public(self, client, auth_headers):
        """Test that profiles are accessible without authentication."""
        me_response = await client.get("/auth/me", headers=auth_headers)
        username = me_response.json()["username"]

        # Access profile without auth headers
        response = await client.get(f"/users/{username}")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_profile_with_participation_data(
        self, client, auth_headers, sponsor_auth_headers, db_session
    ):
        """Test profile includes participation data."""
        # Get user info
        me_response = await client.get("/auth/me", headers=auth_headers)
        user_id = me_response.json()["id"]
        username = me_response.json()["username"]

        # Create competition as sponsor
        comp_data = {
            "title": "Profile API Test Competition",
            "description": "Testing profile API with participation",
            "short_description": "Profile API test",
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

        # Activate competition (default status is DRAFT)
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

        # Check profile
        profile_response = await client.get(f"/users/{username}")
        assert profile_response.status_code == 200

        profile = profile_response.json()
        assert profile["competitions_entered"] >= 1

        # Find our competition in participations
        participation = next(
            (p for p in profile["participations"]
             if p["competition_slug"] == comp_slug),
            None
        )
        assert participation is not None
        assert participation["submission_count"] == 0
