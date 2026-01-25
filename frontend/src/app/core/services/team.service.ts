import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Team,
  TeamInvitation,
  CreateTeamRequest,
  InviteMemberRequest,
  TransferLeadershipRequest,
  TeamActionResponse,
  TeamResponse,
  InvitationResponse,
} from '../models/team.model';

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Team operations
  getTeams(slug: string): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.baseUrl}/competitions/${slug}/teams`);
  }

  getTeam(slug: string, teamId: number): Observable<Team> {
    return this.http.get<Team>(
      `${this.baseUrl}/competitions/${slug}/teams/${teamId}`
    );
  }

  getMyTeam(slug: string): Observable<Team | null> {
    return this.http.get<Team | null>(
      `${this.baseUrl}/competitions/${slug}/my-team`
    );
  }

  createTeam(slug: string, request: CreateTeamRequest): Observable<TeamResponse> {
    return this.http.post<TeamResponse>(
      `${this.baseUrl}/competitions/${slug}/teams`,
      request
    );
  }

  // Member operations
  inviteMember(
    teamId: number,
    request: InviteMemberRequest
  ): Observable<InvitationResponse> {
    return this.http.post<InvitationResponse>(
      `${this.baseUrl}/teams/${teamId}/invite`,
      request
    );
  }

  removeMember(teamId: number, userId: number): Observable<TeamActionResponse> {
    return this.http.delete<TeamActionResponse>(
      `${this.baseUrl}/teams/${teamId}/members/${userId}`
    );
  }

  leaveTeam(teamId: number): Observable<TeamActionResponse> {
    return this.http.post<TeamActionResponse>(
      `${this.baseUrl}/teams/${teamId}/leave`,
      {}
    );
  }

  transferLeadership(
    teamId: number,
    request: TransferLeadershipRequest
  ): Observable<TeamActionResponse> {
    return this.http.post<TeamActionResponse>(
      `${this.baseUrl}/teams/${teamId}/transfer-leadership`,
      request
    );
  }

  // Invitation operations
  getMyInvitations(): Observable<TeamInvitation[]> {
    return this.http.get<TeamInvitation[]>(`${this.baseUrl}/invitations`);
  }

  acceptInvitation(invitationId: number): Observable<TeamActionResponse> {
    return this.http.post<TeamActionResponse>(
      `${this.baseUrl}/invitations/${invitationId}/accept`,
      {}
    );
  }

  declineInvitation(invitationId: number): Observable<TeamActionResponse> {
    return this.http.post<TeamActionResponse>(
      `${this.baseUrl}/invitations/${invitationId}/decline`,
      {}
    );
  }
}
