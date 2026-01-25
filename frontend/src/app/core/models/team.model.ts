export type TeamRole = 'leader' | 'member';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface TeamMember {
  user_id: number;
  username: string;
  display_name: string;
  role: TeamRole;
  joined_at: string;
}

export interface Team {
  id: number;
  name: string;
  competition_id: number;
  competition_slug: string;
  created_at: string;
  members: TeamMember[];
  member_count: number;
}

export interface TeamInvitation {
  id: number;
  team_id: number;
  team_name: string;
  competition_id: number;
  competition_title: string;
  inviter_username: string;
  inviter_display_name: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

export interface CreateTeamRequest {
  name: string;
}

export interface InviteMemberRequest {
  username: string;
}

export interface TransferLeadershipRequest {
  new_leader_id: number;
}

export interface TeamActionResponse {
  message: string;
}

export interface TeamResponse {
  team: Team;
  message?: string;
}

export interface InvitationResponse {
  invitation: TeamInvitation;
  message?: string;
}
