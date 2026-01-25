"""Team API schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.domain.models.team import TeamRole, InvitationStatus


class TeamCreate(BaseModel):
    """Schema for creating a team."""

    name: str = Field(min_length=2, max_length=100)


class TeamMemberResponse(BaseModel):
    """Response schema for a team member."""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    display_name: str
    role: TeamRole
    joined_at: datetime


class TeamResponse(BaseModel):
    """Response schema for a team."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    competition_id: int
    member_count: int
    max_size: int
    created_at: datetime


class TeamDetailResponse(BaseModel):
    """Response schema for team with members."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    competition_id: int
    member_count: int
    max_size: int
    members: list[TeamMemberResponse]
    created_at: datetime


class TeamInviteRequest(BaseModel):
    """Request schema for inviting a member."""

    username: str = Field(min_length=1, max_length=100)


class TeamInvitationResponse(BaseModel):
    """Response schema for a team invitation."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    team_id: int
    team_name: str
    competition_id: int
    inviter_username: str
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime


class TeamLeadershipTransferRequest(BaseModel):
    """Request schema for transferring leadership."""

    new_leader_id: int


class TeamActionResponse(BaseModel):
    """Generic response for team actions."""

    message: str
    success: bool = True
