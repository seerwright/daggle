import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Leaderboard, Submission } from '../models/submission.model';

@Injectable({
  providedIn: 'root',
})
export class SubmissionService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  submit(slug: string, file: File): Observable<Submission> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Submission>(
      `${this.baseUrl}/competitions/${slug}/submissions/`,
      formData
    );
  }

  listMySubmissions(slug: string): Observable<Submission[]> {
    return this.http.get<Submission[]>(
      `${this.baseUrl}/competitions/${slug}/submissions/`
    );
  }

  getLeaderboard(slug: string): Observable<Leaderboard> {
    return this.http.get<Leaderboard>(
      `${this.baseUrl}/competitions/${slug}/leaderboard`
    );
  }
}
