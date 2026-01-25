"""Team service for managing competition teams."""

from datetime import datetime, timedelta, timezone
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.team import (
    Team,
    TeamMember,
    TeamInvitation,
    TeamRole,
    InvitationStatus,
)
from src.domain.models.user import User
from src.domain.models.notification import NotificationType
from src.domain.services.notification import NotificationService
from src.infrastructure.repositories.team import TeamRepository, TeamInvitationRepository
from src.infrastructure.repositories.competition import CompetitionRepository
from src.infrastructure.repositories.enrollment import EnrollmentRepository
from src.infrastructure.repositories.user import UserRepository


# Invitation expires after 7 days
INVITATION_EXPIRY_DAYS = 7


@dataclass
class TeamInfo:
    """Team information with members."""

    id: int
    name: str
    competition_id: int
    member_count: int
    max_size: int
    members: list["TeamMemberInfo"]
    created_at: datetime


@dataclass
class TeamMemberInfo:
    """Team member information."""

    user_id: int
    username: str
    display_name: str
    role: TeamRole
    joined_at: datetime


class TeamService:
    """Service for team operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.team_repo = TeamRepository(session)
        self.invitation_repo = TeamInvitationRepository(session)
        self.competition_repo = CompetitionRepository(session)
        self.enrollment_repo = EnrollmentRepository(session)
        self.user_repo = UserRepository(session)
        self.notification_service = NotificationService(session)

    async def create_team(
        self, name: str, competition_id: int, creator: User
    ) -> Team:
        """Create a new team for a competition.

        Args:
            name: Team name (unique within competition)
            competition_id: Competition to create team in
            creator: User creating the team (becomes leader)

        Returns:
            The created team

        Raises:
            ValueError: If validation fails
        """
        # Validate competition exists and allows teams
        competition = await self.competition_repo.get_by_id(competition_id)
        if not competition:
            raise ValueError("Competition not found")

        if competition.max_team_size <= 1:
            raise ValueError("This competition does not allow teams")

        # Check user is enrolled
        if not await self.enrollment_repo.is_enrolled(creator.id, competition_id):
            raise ValueError("You must be enrolled in the competition to create a team")

        # Check user doesn't already have a team in this competition
        existing_team = await self.team_repo.get_user_team(creator.id, competition_id)
        if existing_team:
            raise ValueError("You are already on a team in this competition")

        # Check team name is unique in competition
        existing_name = await self.team_repo.get_by_name_and_competition(
            name, competition_id
        )
        if existing_name:
            raise ValueError("A team with this name already exists in this competition")

        # Create team
        team = Team(
            name=name,
            competition_id=competition_id,
        )
        team = await self.team_repo.create(team)

        # Add creator as leader
        member = TeamMember(
            team_id=team.id,
            user_id=creator.id,
            role=TeamRole.LEADER,
        )
        await self.team_repo.add_member(member)

        await self.session.commit()
        await self.session.refresh(team)
        return team

    async def get_team(self, team_id: int) -> Team | None:
        """Get a team by ID."""
        return await self.team_repo.get_by_id(team_id)

    async def get_team_info(self, team_id: int) -> TeamInfo | None:
        """Get detailed team information."""
        team = await self.team_repo.get_by_id(team_id)
        if not team:
            return None

        competition = await self.competition_repo.get_by_id(team.competition_id)
        members = await self.team_repo.get_team_members(team_id)

        member_infos = []
        for member in members:
            user = await self.user_repo.get_by_id(member.user_id)
            if user:
                member_infos.append(
                    TeamMemberInfo(
                        user_id=user.id,
                        username=user.username,
                        display_name=user.display_name,
                        role=member.role,
                        joined_at=member.created_at,
                    )
                )

        return TeamInfo(
            id=team.id,
            name=team.name,
            competition_id=team.competition_id,
            member_count=len(members),
            max_size=competition.max_team_size if competition else 1,
            members=member_infos,
            created_at=team.created_at,
        )

    async def get_user_team(self, user_id: int, competition_id: int) -> Team | None:
        """Get the team a user belongs to in a competition."""
        return await self.team_repo.get_user_team(user_id, competition_id)

    async def list_teams(
        self, competition_id: int, skip: int = 0, limit: int = 100
    ) -> list[Team]:
        """List all teams in a competition."""
        return await self.team_repo.get_by_competition(
            competition_id, skip=skip, limit=limit
        )

    async def invite_member(
        self, team_id: int, invitee_username: str, inviter: User
    ) -> TeamInvitation:
        """Invite a user to join a team.

        Args:
            team_id: Team to invite to
            invitee_username: Username of user to invite
            inviter: User sending the invitation

        Returns:
            The created invitation

        Raises:
            ValueError: If validation fails
        """
        team = await self.team_repo.get_by_id(team_id)
        if not team:
            raise ValueError("Team not found")

        # Check inviter is team leader
        inviter_member = await self.team_repo.get_member(team_id, inviter.id)
        if not inviter_member or inviter_member.role != TeamRole.LEADER:
            raise ValueError("Only team leaders can invite members")

        # Get invitee
        invitee = await self.user_repo.get_by_username(invitee_username)
        if not invitee:
            raise ValueError("User not found")

        # Check invitee is enrolled
        if not await self.enrollment_repo.is_enrolled(invitee.id, team.competition_id):
            raise ValueError("User must be enrolled in the competition")

        # Check invitee doesn't already have a team
        existing_team = await self.team_repo.get_user_team(
            invitee.id, team.competition_id
        )
        if existing_team:
            raise ValueError("User is already on a team in this competition")

        # Check team isn't full
        competition = await self.competition_repo.get_by_id(team.competition_id)
        member_count = await self.team_repo.count_members(team_id)
        if member_count >= competition.max_team_size:
            raise ValueError("Team is full")

        # Check no pending invitation exists
        existing_invitation = await self.invitation_repo.get_pending_invitation(
            team_id, invitee.id
        )
        if existing_invitation:
            raise ValueError("An invitation is already pending for this user")

        # Create invitation
        invitation = TeamInvitation(
            team_id=team_id,
            inviter_id=inviter.id,
            invitee_id=invitee.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=INVITATION_EXPIRY_DAYS),
        )
        invitation = await self.invitation_repo.create(invitation)

        # Send notification
        await self.notification_service.create(
            user_id=invitee.id,
            notification_type=NotificationType.TEAM_INVITATION,
            title="Team Invitation",
            message=f"You've been invited to join team '{team.name}'",
            link=f"/competitions/{team.competition_id}/teams/{team_id}",
        )

        await self.session.commit()
        return invitation

    async def accept_invitation(
        self, invitation_id: int, user: User
    ) -> TeamMember:
        """Accept a team invitation.

        Args:
            invitation_id: ID of the invitation to accept
            user: User accepting the invitation

        Returns:
            The new team membership

        Raises:
            ValueError: If validation fails
        """
        invitation = await self.invitation_repo.get_by_id(invitation_id)
        if not invitation:
            raise ValueError("Invitation not found")

        if invitation.invitee_id != user.id:
            raise ValueError("This invitation is not for you")

        if invitation.status != InvitationStatus.PENDING:
            raise ValueError("This invitation is no longer pending")

        # Handle timezone-aware and naive datetimes (SQLite returns naive)
        now = datetime.now(timezone.utc)
        expires_at = invitation.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now:
            invitation.status = InvitationStatus.EXPIRED
            await self.session.commit()
            raise ValueError("This invitation has expired")

        # Verify team still has space
        team = await self.team_repo.get_by_id(invitation.team_id)
        if not team:
            raise ValueError("Team no longer exists")

        competition = await self.competition_repo.get_by_id(team.competition_id)
        member_count = await self.team_repo.count_members(team.id)
        if member_count >= competition.max_team_size:
            raise ValueError("Team is now full")

        # Check user doesn't have a team now
        existing_team = await self.team_repo.get_user_team(user.id, team.competition_id)
        if existing_team:
            raise ValueError("You have already joined a team")

        # Accept invitation
        invitation.status = InvitationStatus.ACCEPTED

        # Add member
        member = TeamMember(
            team_id=team.id,
            user_id=user.id,
            role=TeamRole.MEMBER,
        )
        await self.team_repo.add_member(member)

        # Notify team leader
        leader_member = next(
            (m for m in await self.team_repo.get_team_members(team.id)
             if m.role == TeamRole.LEADER),
            None,
        )
        if leader_member:
            await self.notification_service.create(
                user_id=leader_member.user_id,
                notification_type=NotificationType.TEAM_MEMBER_JOINED,
                title="New Team Member",
                message=f"{user.display_name} has joined your team '{team.name}'",
                link=f"/competitions/{team.competition_id}/teams/{team.id}",
            )

        await self.session.commit()
        await self.session.refresh(member)
        return member

    async def decline_invitation(self, invitation_id: int, user: User) -> None:
        """Decline a team invitation.

        Args:
            invitation_id: ID of the invitation to decline
            user: User declining the invitation

        Raises:
            ValueError: If validation fails
        """
        invitation = await self.invitation_repo.get_by_id(invitation_id)
        if not invitation:
            raise ValueError("Invitation not found")

        if invitation.invitee_id != user.id:
            raise ValueError("This invitation is not for you")

        if invitation.status != InvitationStatus.PENDING:
            raise ValueError("This invitation is no longer pending")

        invitation.status = InvitationStatus.DECLINED
        await self.session.commit()

    async def leave_team(self, team_id: int, user: User) -> None:
        """Leave a team.

        Args:
            team_id: Team to leave
            user: User leaving the team

        Raises:
            ValueError: If validation fails
        """
        team = await self.team_repo.get_by_id(team_id)
        if not team:
            raise ValueError("Team not found")

        member = await self.team_repo.get_member(team_id, user.id)
        if not member:
            raise ValueError("You are not a member of this team")

        if member.role == TeamRole.LEADER:
            # If leader leaves, promote someone else or dissolve team
            members = await self.team_repo.get_team_members(team_id)
            other_members = [m for m in members if m.user_id != user.id]

            if other_members:
                # Promote the first other member to leader
                new_leader = other_members[0]
                await self.team_repo.update_member_role(
                    team_id, new_leader.user_id, TeamRole.LEADER
                )

        await self.team_repo.remove_member(team_id, user.id)
        await self.session.commit()

    async def remove_member(
        self, team_id: int, member_user_id: int, remover: User
    ) -> None:
        """Remove a member from a team (leader only).

        Args:
            team_id: Team to remove member from
            member_user_id: User ID of member to remove
            remover: User performing the removal (must be leader)

        Raises:
            ValueError: If validation fails
        """
        team = await self.team_repo.get_by_id(team_id)
        if not team:
            raise ValueError("Team not found")

        # Check remover is leader
        remover_member = await self.team_repo.get_member(team_id, remover.id)
        if not remover_member or remover_member.role != TeamRole.LEADER:
            raise ValueError("Only team leaders can remove members")

        if member_user_id == remover.id:
            raise ValueError("You cannot remove yourself. Use leave team instead.")

        member = await self.team_repo.get_member(team_id, member_user_id)
        if not member:
            raise ValueError("User is not a member of this team")

        await self.team_repo.remove_member(team_id, member_user_id)

        # Notify removed member
        await self.notification_service.create(
            user_id=member_user_id,
            notification_type=NotificationType.TEAM_REMOVED,
            title="Removed from Team",
            message=f"You have been removed from team '{team.name}'",
            link=f"/competitions/{team.competition_id}",
        )

        await self.session.commit()

    async def get_pending_invitations(self, user: User) -> list[TeamInvitation]:
        """Get all pending invitations for a user."""
        return await self.invitation_repo.get_pending_for_user(user.id)

    async def transfer_leadership(
        self, team_id: int, new_leader_id: int, current_leader: User
    ) -> None:
        """Transfer team leadership to another member.

        Args:
            team_id: Team ID
            new_leader_id: User ID of new leader
            current_leader: Current leader performing the transfer

        Raises:
            ValueError: If validation fails
        """
        team = await self.team_repo.get_by_id(team_id)
        if not team:
            raise ValueError("Team not found")

        # Check current user is leader
        current_member = await self.team_repo.get_member(team_id, current_leader.id)
        if not current_member or current_member.role != TeamRole.LEADER:
            raise ValueError("Only the team leader can transfer leadership")

        # Check new leader is a member
        new_leader_member = await self.team_repo.get_member(team_id, new_leader_id)
        if not new_leader_member:
            raise ValueError("User is not a member of this team")

        # Transfer leadership
        await self.team_repo.update_member_role(team_id, current_leader.id, TeamRole.MEMBER)
        await self.team_repo.update_member_role(team_id, new_leader_id, TeamRole.LEADER)

        # Notify new leader
        await self.notification_service.create(
            user_id=new_leader_id,
            notification_type=NotificationType.TEAM_LEADERSHIP,
            title="Team Leadership",
            message=f"You are now the leader of team '{team.name}'",
            link=f"/competitions/{team.competition_id}/teams/{team_id}",
        )

        await self.session.commit()
