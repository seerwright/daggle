"""Team API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user
from src.api.schemas.team import (
    TeamCreate,
    TeamResponse,
    TeamDetailResponse,
    TeamMemberResponse,
    TeamInviteRequest,
    TeamInvitationResponse,
    TeamLeadershipTransferRequest,
    TeamActionResponse,
)
from src.domain.models.user import User
from src.domain.services.team import TeamService
from src.infrastructure.database import get_db
from src.infrastructure.repositories.competition import CompetitionRepository

router = APIRouter(tags=["teams"])


@router.get(
    "/competitions/{slug}/teams",
    response_model=list[TeamResponse],
)
async def list_teams(
    slug: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all teams in a competition."""
    comp_repo = CompetitionRepository(db)
    competition = await comp_repo.get_by_slug(slug)
    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    service = TeamService(db)
    teams = await service.list_teams(competition.id, skip=skip, limit=limit)

    return [
        TeamResponse(
            id=team.id,
            name=team.name,
            competition_id=team.competition_id,
            member_count=len(team.members),
            max_size=competition.max_team_size,
            created_at=team.created_at,
        )
        for team in teams
    ]


@router.post(
    "/competitions/{slug}/teams",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_team(
    slug: str,
    data: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new team in a competition."""
    comp_repo = CompetitionRepository(db)
    competition = await comp_repo.get_by_slug(slug)
    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    service = TeamService(db)
    try:
        team = await service.create_team(data.name, competition.id, current_user)
        return TeamResponse(
            id=team.id,
            name=team.name,
            competition_id=team.competition_id,
            member_count=1,  # Creator is the first member
            max_size=competition.max_team_size,
            created_at=team.created_at,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/competitions/{slug}/teams/{team_id}",
    response_model=TeamDetailResponse,
)
async def get_team(
    slug: str,
    team_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get team details including members."""
    comp_repo = CompetitionRepository(db)
    competition = await comp_repo.get_by_slug(slug)
    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    service = TeamService(db)
    team_info = await service.get_team_info(team_id)

    if not team_info or team_info.competition_id != competition.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    return TeamDetailResponse(
        id=team_info.id,
        name=team_info.name,
        competition_id=team_info.competition_id,
        member_count=team_info.member_count,
        max_size=team_info.max_size,
        members=[
            TeamMemberResponse(
                user_id=m.user_id,
                username=m.username,
                display_name=m.display_name,
                role=m.role,
                joined_at=m.joined_at,
            )
            for m in team_info.members
        ],
        created_at=team_info.created_at,
    )


@router.get(
    "/competitions/{slug}/my-team",
    response_model=TeamDetailResponse | None,
)
async def get_my_team(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's team in a competition."""
    comp_repo = CompetitionRepository(db)
    competition = await comp_repo.get_by_slug(slug)
    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    service = TeamService(db)
    team = await service.get_user_team(current_user.id, competition.id)

    if not team:
        return None

    team_info = await service.get_team_info(team.id)
    return TeamDetailResponse(
        id=team_info.id,
        name=team_info.name,
        competition_id=team_info.competition_id,
        member_count=team_info.member_count,
        max_size=team_info.max_size,
        members=[
            TeamMemberResponse(
                user_id=m.user_id,
                username=m.username,
                display_name=m.display_name,
                role=m.role,
                joined_at=m.joined_at,
            )
            for m in team_info.members
        ],
        created_at=team_info.created_at,
    )


@router.post(
    "/teams/{team_id}/invite",
    response_model=TeamActionResponse,
)
async def invite_member(
    team_id: int,
    data: TeamInviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite a user to join the team (leader only)."""
    service = TeamService(db)
    try:
        await service.invite_member(team_id, data.username, current_user)
        return TeamActionResponse(message=f"Invitation sent to {data.username}")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/invitations",
    response_model=list[TeamInvitationResponse],
)
async def get_my_invitations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all pending invitations for the current user."""
    service = TeamService(db)
    invitations = await service.get_pending_invitations(current_user)

    result = []
    for inv in invitations:
        team = await service.get_team(inv.team_id)
        if team:
            from src.infrastructure.repositories.user import UserRepository
            user_repo = UserRepository(db)
            inviter = await user_repo.get_by_id(inv.inviter_id)
            result.append(
                TeamInvitationResponse(
                    id=inv.id,
                    team_id=inv.team_id,
                    team_name=team.name,
                    competition_id=team.competition_id,
                    inviter_username=inviter.username if inviter else "Unknown",
                    status=inv.status,
                    expires_at=inv.expires_at,
                    created_at=inv.created_at,
                )
            )

    return result


@router.post(
    "/invitations/{invitation_id}/accept",
    response_model=TeamActionResponse,
)
async def accept_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept a team invitation."""
    service = TeamService(db)
    try:
        await service.accept_invitation(invitation_id, current_user)
        return TeamActionResponse(message="You have joined the team")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/invitations/{invitation_id}/decline",
    response_model=TeamActionResponse,
)
async def decline_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Decline a team invitation."""
    service = TeamService(db)
    try:
        await service.decline_invitation(invitation_id, current_user)
        return TeamActionResponse(message="Invitation declined")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/teams/{team_id}/leave",
    response_model=TeamActionResponse,
)
async def leave_team(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Leave a team."""
    service = TeamService(db)
    try:
        await service.leave_team(team_id, current_user)
        return TeamActionResponse(message="You have left the team")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete(
    "/teams/{team_id}/members/{user_id}",
    response_model=TeamActionResponse,
)
async def remove_member(
    team_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from the team (leader only)."""
    service = TeamService(db)
    try:
        await service.remove_member(team_id, user_id, current_user)
        return TeamActionResponse(message="Member removed from team")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/teams/{team_id}/transfer-leadership",
    response_model=TeamActionResponse,
)
async def transfer_leadership(
    team_id: int,
    data: TeamLeadershipTransferRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Transfer team leadership to another member."""
    service = TeamService(db)
    try:
        await service.transfer_leadership(team_id, data.new_leader_id, current_user)
        return TeamActionResponse(message="Leadership transferred successfully")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
