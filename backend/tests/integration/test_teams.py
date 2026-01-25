"""Integration tests for teams."""

from datetime import datetime, timedelta, timezone

import pytest

from src.domain.models.competition import Competition, CompetitionStatus, Difficulty
from src.domain.models.enrollment import Enrollment
from src.domain.models.team import Team, TeamMember, TeamInvitation, TeamRole, InvitationStatus
from src.domain.models.user import User, UserRole
from src.common.security import hash_password


class TestTeamService:
    """Tests for the TeamService."""

    @pytest.fixture
    async def team_leader(self, db_session):
        """Create a user to be team leader."""
        user = User(
            email="teamleader@example.com",
            username="teamleader",
            hashed_password=hash_password("password123"),
            display_name="Team Leader",
            role=UserRole.PARTICIPANT,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest.fixture
    async def team_member_user(self, db_session):
        """Create a user to be a team member."""
        user = User(
            email="teammember@example.com",
            username="teammember",
            hashed_password=hash_password("password123"),
            display_name="Team Member",
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
            email="teamsponsor@example.com",
            username="teamsponsor",
            hashed_password=hash_password("password123"),
            display_name="Team Sponsor",
            role=UserRole.SPONSOR,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest.fixture
    async def team_competition(self, db_session, sponsor_user):
        """Create a competition that allows teams."""
        now = datetime.now(timezone.utc)
        competition = Competition(
            title="Team Competition",
            slug="team-comp",
            description="A competition that allows teams",
            short_description="Team competition",
            difficulty=Difficulty.BEGINNER,
            evaluation_metric="auc_roc",
            start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=25),
            status=CompetitionStatus.ACTIVE,
            max_team_size=4,
            daily_submission_limit=5,
            sponsor_id=sponsor_user.id,
        )
        db_session.add(competition)
        await db_session.commit()
        await db_session.refresh(competition)
        return competition

    @pytest.fixture
    async def solo_competition(self, db_session, sponsor_user):
        """Create a competition that doesn't allow teams."""
        now = datetime.now(timezone.utc)
        competition = Competition(
            title="Solo Competition",
            slug="solo-comp",
            description="A solo competition",
            short_description="Solo competition",
            difficulty=Difficulty.BEGINNER,
            evaluation_metric="auc_roc",
            start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=25),
            status=CompetitionStatus.ACTIVE,
            max_team_size=1,  # No teams
            daily_submission_limit=5,
            sponsor_id=sponsor_user.id,
        )
        db_session.add(competition)
        await db_session.commit()
        await db_session.refresh(competition)
        return competition

    @pytest.mark.asyncio
    async def test_create_team(
        self, db_session, team_leader, team_competition
    ):
        """Test creating a team."""
        from src.domain.services.team import TeamService

        # Enroll the user first
        enrollment = Enrollment(
            user_id=team_leader.id,
            competition_id=team_competition.id,
        )
        db_session.add(enrollment)
        await db_session.commit()

        service = TeamService(db_session)
        team = await service.create_team(
            "Test Team", team_competition.id, team_leader
        )

        assert team is not None
        assert team.name == "Test Team"
        assert team.competition_id == team_competition.id
        assert len(team.members) == 1
        assert team.members[0].user_id == team_leader.id
        assert team.members[0].role == TeamRole.LEADER

    @pytest.mark.asyncio
    async def test_create_team_solo_competition_fails(
        self, db_session, team_leader, solo_competition
    ):
        """Test that creating a team in a solo competition fails."""
        from src.domain.services.team import TeamService

        enrollment = Enrollment(
            user_id=team_leader.id,
            competition_id=solo_competition.id,
        )
        db_session.add(enrollment)
        await db_session.commit()

        service = TeamService(db_session)
        with pytest.raises(ValueError, match="does not allow teams"):
            await service.create_team(
                "Test Team", solo_competition.id, team_leader
            )

    @pytest.mark.asyncio
    async def test_create_team_not_enrolled_fails(
        self, db_session, team_leader, team_competition
    ):
        """Test that creating a team without being enrolled fails."""
        from src.domain.services.team import TeamService

        service = TeamService(db_session)
        with pytest.raises(ValueError, match="must be enrolled"):
            await service.create_team(
                "Test Team", team_competition.id, team_leader
            )

    @pytest.mark.asyncio
    async def test_create_team_already_on_team_fails(
        self, db_session, team_leader, team_competition
    ):
        """Test that creating a second team fails."""
        from src.domain.services.team import TeamService

        enrollment = Enrollment(
            user_id=team_leader.id,
            competition_id=team_competition.id,
        )
        db_session.add(enrollment)
        await db_session.commit()

        service = TeamService(db_session)
        await service.create_team("Team 1", team_competition.id, team_leader)

        with pytest.raises(ValueError, match="already on a team"):
            await service.create_team("Team 2", team_competition.id, team_leader)

    @pytest.mark.asyncio
    async def test_invite_member(
        self, db_session, team_leader, team_member_user, team_competition
    ):
        """Test inviting a member to a team."""
        from src.domain.services.team import TeamService

        # Enroll both users
        for user in [team_leader, team_member_user]:
            enrollment = Enrollment(
                user_id=user.id,
                competition_id=team_competition.id,
            )
            db_session.add(enrollment)
        await db_session.commit()

        service = TeamService(db_session)
        team = await service.create_team(
            "Test Team", team_competition.id, team_leader
        )

        invitation = await service.invite_member(
            team.id, team_member_user.username, team_leader
        )

        assert invitation is not None
        assert invitation.team_id == team.id
        assert invitation.invitee_id == team_member_user.id
        assert invitation.inviter_id == team_leader.id
        assert invitation.status == InvitationStatus.PENDING

    @pytest.mark.asyncio
    async def test_accept_invitation(
        self, db_session, team_leader, team_member_user, team_competition
    ):
        """Test accepting a team invitation."""
        from src.domain.services.team import TeamService

        # Enroll both users
        for user in [team_leader, team_member_user]:
            enrollment = Enrollment(
                user_id=user.id,
                competition_id=team_competition.id,
            )
            db_session.add(enrollment)
        await db_session.commit()

        service = TeamService(db_session)
        team = await service.create_team(
            "Test Team", team_competition.id, team_leader
        )
        invitation = await service.invite_member(
            team.id, team_member_user.username, team_leader
        )

        member = await service.accept_invitation(invitation.id, team_member_user)

        assert member is not None
        assert member.team_id == team.id
        assert member.user_id == team_member_user.id
        assert member.role == TeamRole.MEMBER

        # Check team now has 2 members
        team_info = await service.get_team_info(team.id)
        assert team_info.member_count == 2

    @pytest.mark.asyncio
    async def test_decline_invitation(
        self, db_session, team_leader, team_member_user, team_competition
    ):
        """Test declining a team invitation."""
        from src.domain.services.team import TeamService

        for user in [team_leader, team_member_user]:
            enrollment = Enrollment(
                user_id=user.id,
                competition_id=team_competition.id,
            )
            db_session.add(enrollment)
        await db_session.commit()

        service = TeamService(db_session)
        team = await service.create_team(
            "Test Team", team_competition.id, team_leader
        )
        invitation = await service.invite_member(
            team.id, team_member_user.username, team_leader
        )

        await service.decline_invitation(invitation.id, team_member_user)

        # Refresh and check status
        from src.infrastructure.repositories.team import TeamInvitationRepository
        inv_repo = TeamInvitationRepository(db_session)
        updated_inv = await inv_repo.get_by_id(invitation.id)
        assert updated_inv.status == InvitationStatus.DECLINED

    @pytest.mark.asyncio
    async def test_leave_team(
        self, db_session, team_leader, team_member_user, team_competition
    ):
        """Test member leaving a team."""
        from src.domain.services.team import TeamService

        for user in [team_leader, team_member_user]:
            enrollment = Enrollment(
                user_id=user.id,
                competition_id=team_competition.id,
            )
            db_session.add(enrollment)
        await db_session.commit()

        service = TeamService(db_session)
        team = await service.create_team(
            "Test Team", team_competition.id, team_leader
        )
        invitation = await service.invite_member(
            team.id, team_member_user.username, team_leader
        )
        await service.accept_invitation(invitation.id, team_member_user)

        # Member leaves
        await service.leave_team(team.id, team_member_user)

        team_info = await service.get_team_info(team.id)
        assert team_info.member_count == 1

    @pytest.mark.asyncio
    async def test_leader_leaves_promotes_member(
        self, db_session, team_leader, team_member_user, team_competition
    ):
        """Test that when leader leaves, another member is promoted."""
        from src.domain.services.team import TeamService

        for user in [team_leader, team_member_user]:
            enrollment = Enrollment(
                user_id=user.id,
                competition_id=team_competition.id,
            )
            db_session.add(enrollment)
        await db_session.commit()

        service = TeamService(db_session)
        team = await service.create_team(
            "Test Team", team_competition.id, team_leader
        )
        invitation = await service.invite_member(
            team.id, team_member_user.username, team_leader
        )
        await service.accept_invitation(invitation.id, team_member_user)

        # Leader leaves
        await service.leave_team(team.id, team_leader)

        # Check new leader
        team_info = await service.get_team_info(team.id)
        assert team_info.member_count == 1
        assert team_info.members[0].user_id == team_member_user.id
        assert team_info.members[0].role == TeamRole.LEADER

    @pytest.mark.asyncio
    async def test_transfer_leadership(
        self, db_session, team_leader, team_member_user, team_competition
    ):
        """Test transferring team leadership."""
        from src.domain.services.team import TeamService

        for user in [team_leader, team_member_user]:
            enrollment = Enrollment(
                user_id=user.id,
                competition_id=team_competition.id,
            )
            db_session.add(enrollment)
        await db_session.commit()

        service = TeamService(db_session)
        team = await service.create_team(
            "Test Team", team_competition.id, team_leader
        )
        invitation = await service.invite_member(
            team.id, team_member_user.username, team_leader
        )
        await service.accept_invitation(invitation.id, team_member_user)

        await service.transfer_leadership(
            team.id, team_member_user.id, team_leader
        )

        team_info = await service.get_team_info(team.id)
        for member in team_info.members:
            if member.user_id == team_member_user.id:
                assert member.role == TeamRole.LEADER
            else:
                assert member.role == TeamRole.MEMBER


class TestTeamAPI:
    """Tests for team API endpoints."""

    @pytest.fixture
    async def team_auth_headers(self, client, db_session):
        """Get auth headers for a new user."""
        user_data = {
            "email": "teamapiuser@example.com",
            "username": "teamapiuser",
            "password": "password123",
            "display_name": "Team API User",
        }
        await client.post("/auth/register", json=user_data)
        response = await client.post(
            "/auth/login",
            json={"email": user_data["email"], "password": user_data["password"]},
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture
    async def second_user_auth_headers(self, client, db_session):
        """Get auth headers for a second user."""
        user_data = {
            "email": "secondteamuser@example.com",
            "username": "secondteamuser",
            "password": "password123",
            "display_name": "Second Team User",
        }
        await client.post("/auth/register", json=user_data)
        response = await client.post(
            "/auth/login",
            json={"email": user_data["email"], "password": user_data["password"]},
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    @pytest.mark.asyncio
    async def test_create_team_endpoint(
        self, client, team_auth_headers, sponsor_auth_headers
    ):
        """Test creating a team via API."""
        # Create competition
        comp_data = {
            "title": "API Team Competition",
            "description": "Testing team creation via API",
            "short_description": "API team test",
            "difficulty": "beginner",
            "evaluation_metric": "auc_roc",
            "max_team_size": 4,
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
        await client.patch(
            f"/competitions/{comp_slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        # Enroll user
        enroll_response = await client.post(
            f"/competitions/{comp_slug}/enroll",
            headers=team_auth_headers,
        )
        assert enroll_response.status_code == 201

        # Create team
        team_response = await client.post(
            f"/competitions/{comp_slug}/teams",
            json={"name": "API Test Team"},
            headers=team_auth_headers,
        )
        assert team_response.status_code == 201

        team = team_response.json()
        assert team["name"] == "API Test Team"
        assert team["member_count"] == 1
        assert team["max_size"] == 4

    @pytest.mark.asyncio
    async def test_list_teams_endpoint(
        self, client, team_auth_headers, sponsor_auth_headers
    ):
        """Test listing teams via API."""
        # Create and setup competition
        comp_data = {
            "title": "List Teams Competition",
            "description": "Testing team listing",
            "short_description": "List teams test",
            "difficulty": "beginner",
            "evaluation_metric": "auc_roc",
            "max_team_size": 4,
            "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        }
        comp_response = await client.post(
            "/competitions/",
            json=comp_data,
            headers=sponsor_auth_headers,
        )
        comp_slug = comp_response.json()["slug"]

        await client.patch(
            f"/competitions/{comp_slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        await client.post(
            f"/competitions/{comp_slug}/enroll",
            headers=team_auth_headers,
        )

        await client.post(
            f"/competitions/{comp_slug}/teams",
            json={"name": "Listed Team"},
            headers=team_auth_headers,
        )

        # List teams
        list_response = await client.get(f"/competitions/{comp_slug}/teams")
        assert list_response.status_code == 200

        teams = list_response.json()
        assert len(teams) >= 1
        assert any(t["name"] == "Listed Team" for t in teams)

    @pytest.mark.asyncio
    async def test_get_my_team_endpoint(
        self, client, team_auth_headers, sponsor_auth_headers
    ):
        """Test getting user's team via API."""
        # Setup
        comp_data = {
            "title": "My Team Competition",
            "description": "Testing my team endpoint",
            "short_description": "My team test",
            "difficulty": "beginner",
            "evaluation_metric": "auc_roc",
            "max_team_size": 4,
            "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        }
        comp_response = await client.post(
            "/competitions/",
            json=comp_data,
            headers=sponsor_auth_headers,
        )
        comp_slug = comp_response.json()["slug"]

        await client.patch(
            f"/competitions/{comp_slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        await client.post(
            f"/competitions/{comp_slug}/enroll",
            headers=team_auth_headers,
        )

        await client.post(
            f"/competitions/{comp_slug}/teams",
            json={"name": "My Test Team"},
            headers=team_auth_headers,
        )

        # Get my team
        my_team_response = await client.get(
            f"/competitions/{comp_slug}/my-team",
            headers=team_auth_headers,
        )
        assert my_team_response.status_code == 200

        my_team = my_team_response.json()
        assert my_team["name"] == "My Test Team"
        assert len(my_team["members"]) == 1

    @pytest.mark.asyncio
    async def test_invite_and_accept_flow(
        self, client, team_auth_headers, second_user_auth_headers, sponsor_auth_headers
    ):
        """Test the full invite and accept flow."""
        # Setup competition
        comp_data = {
            "title": "Invite Flow Competition",
            "description": "Testing invite flow",
            "short_description": "Invite flow test",
            "difficulty": "beginner",
            "evaluation_metric": "auc_roc",
            "max_team_size": 4,
            "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        }
        comp_response = await client.post(
            "/competitions/",
            json=comp_data,
            headers=sponsor_auth_headers,
        )
        comp_slug = comp_response.json()["slug"]

        await client.patch(
            f"/competitions/{comp_slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        # Enroll both users
        await client.post(
            f"/competitions/{comp_slug}/enroll",
            headers=team_auth_headers,
        )
        await client.post(
            f"/competitions/{comp_slug}/enroll",
            headers=second_user_auth_headers,
        )

        # Create team
        team_response = await client.post(
            f"/competitions/{comp_slug}/teams",
            json={"name": "Invite Flow Team"},
            headers=team_auth_headers,
        )
        team_id = team_response.json()["id"]

        # Invite second user
        invite_response = await client.post(
            f"/teams/{team_id}/invite",
            json={"username": "secondteamuser"},
            headers=team_auth_headers,
        )
        assert invite_response.status_code == 200

        # Check invitations for second user
        invitations_response = await client.get(
            "/invitations",
            headers=second_user_auth_headers,
        )
        assert invitations_response.status_code == 200
        invitations = invitations_response.json()
        assert len(invitations) >= 1

        invitation_id = invitations[0]["id"]

        # Accept invitation
        accept_response = await client.post(
            f"/invitations/{invitation_id}/accept",
            headers=second_user_auth_headers,
        )
        assert accept_response.status_code == 200

        # Verify team has 2 members
        team_detail = await client.get(
            f"/competitions/{comp_slug}/teams/{team_id}",
        )
        assert team_detail.json()["member_count"] == 2

    @pytest.mark.asyncio
    async def test_team_requires_enrollment(
        self, client, team_auth_headers, sponsor_auth_headers
    ):
        """Test that creating a team requires enrollment."""
        comp_data = {
            "title": "Enrollment Required Competition",
            "description": "Testing enrollment requirement",
            "short_description": "Enrollment test",
            "difficulty": "beginner",
            "evaluation_metric": "auc_roc",
            "max_team_size": 4,
            "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        }
        comp_response = await client.post(
            "/competitions/",
            json=comp_data,
            headers=sponsor_auth_headers,
        )
        comp_slug = comp_response.json()["slug"]

        await client.patch(
            f"/competitions/{comp_slug}",
            json={"status": "active"},
            headers=sponsor_auth_headers,
        )

        # Try to create team without enrolling
        team_response = await client.post(
            f"/competitions/{comp_slug}/teams",
            json={"name": "No Enroll Team"},
            headers=team_auth_headers,
        )
        assert team_response.status_code == 400
        assert "enrolled" in team_response.json()["detail"].lower()
