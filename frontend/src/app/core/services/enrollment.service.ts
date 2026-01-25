import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EnrollmentStatus {
  enrolled: boolean;
  enrolled_at: string | null;
}

export interface EnrollmentActionResponse {
  message: string;
  enrolled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class EnrollmentService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStatus(slug: string): Observable<EnrollmentStatus> {
    return this.http.get<EnrollmentStatus>(
      `${this.baseUrl}/competitions/${slug}/enrollment`
    );
  }

  enroll(slug: string): Observable<EnrollmentActionResponse> {
    return this.http.post<EnrollmentActionResponse>(
      `${this.baseUrl}/competitions/${slug}/enroll`,
      {}
    );
  }

  unenroll(slug: string): Observable<EnrollmentActionResponse> {
    return this.http.delete<EnrollmentActionResponse>(
      `${this.baseUrl}/competitions/${slug}/enroll`
    );
  }
}
