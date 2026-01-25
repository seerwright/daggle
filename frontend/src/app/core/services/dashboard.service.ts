import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardResponse,
  DashboardStatsResponse,
} from '../models/dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.baseUrl}/dashboard`);
  }

  getStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(
      `${this.baseUrl}/dashboard/stats`
    );
  }
}
