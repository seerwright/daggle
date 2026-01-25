import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile, ProfileStatsResponse } from '../models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProfile(username: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/users/${username}`);
  }

  getProfileStats(username: string): Observable<ProfileStatsResponse> {
    return this.http.get<ProfileStatsResponse>(
      `${this.baseUrl}/users/${username}/stats`
    );
  }
}
