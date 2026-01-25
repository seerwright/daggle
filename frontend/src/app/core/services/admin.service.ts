import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PlatformStats,
  UserSummary,
  AdminCompetition,
  UserRoleUpdateRequest,
  AdminActionResponse,
  UserRole,
  CompetitionStatus,
} from '../models/admin.model';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Platform stats
  getPlatformStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${this.baseUrl}/admin/stats`);
  }

  // User management
  listUsers(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    is_active?: boolean;
  }): Observable<UserSummary[]> {
    const queryParams: Record<string, string> = {};
    if (params?.skip !== undefined) queryParams['skip'] = params.skip.toString();
    if (params?.limit !== undefined) queryParams['limit'] = params.limit.toString();
    if (params?.search) queryParams['search'] = params.search;
    if (params?.role) queryParams['role'] = params.role;
    if (params?.is_active !== undefined)
      queryParams['is_active'] = params.is_active.toString();

    return this.http.get<UserSummary[]>(`${this.baseUrl}/admin/users`, {
      params: queryParams,
    });
  }

  getUser(userId: number): Observable<UserSummary> {
    return this.http.get<UserSummary>(`${this.baseUrl}/admin/users/${userId}`);
  }

  suspendUser(userId: number): Observable<AdminActionResponse> {
    return this.http.post<AdminActionResponse>(
      `${this.baseUrl}/admin/users/${userId}/suspend`,
      {}
    );
  }

  reactivateUser(userId: number): Observable<AdminActionResponse> {
    return this.http.post<AdminActionResponse>(
      `${this.baseUrl}/admin/users/${userId}/reactivate`,
      {}
    );
  }

  changeUserRole(
    userId: number,
    request: UserRoleUpdateRequest
  ): Observable<AdminActionResponse> {
    return this.http.patch<AdminActionResponse>(
      `${this.baseUrl}/admin/users/${userId}/role`,
      request
    );
  }

  // Competition management
  listCompetitions(params?: {
    skip?: number;
    limit?: number;
    status?: CompetitionStatus;
  }): Observable<AdminCompetition[]> {
    const queryParams: Record<string, string> = {};
    if (params?.skip !== undefined) queryParams['skip'] = params.skip.toString();
    if (params?.limit !== undefined) queryParams['limit'] = params.limit.toString();
    if (params?.status) queryParams['status'] = params.status;

    return this.http.get<AdminCompetition[]>(
      `${this.baseUrl}/admin/competitions`,
      { params: queryParams }
    );
  }

  // Thread moderation
  lockThread(threadId: number): Observable<AdminActionResponse> {
    return this.http.post<AdminActionResponse>(
      `${this.baseUrl}/admin/threads/${threadId}/lock`,
      {}
    );
  }

  unlockThread(threadId: number): Observable<AdminActionResponse> {
    return this.http.post<AdminActionResponse>(
      `${this.baseUrl}/admin/threads/${threadId}/unlock`,
      {}
    );
  }

  pinThread(threadId: number): Observable<AdminActionResponse> {
    return this.http.post<AdminActionResponse>(
      `${this.baseUrl}/admin/threads/${threadId}/pin`,
      {}
    );
  }

  unpinThread(threadId: number): Observable<AdminActionResponse> {
    return this.http.post<AdminActionResponse>(
      `${this.baseUrl}/admin/threads/${threadId}/unpin`,
      {}
    );
  }
}
