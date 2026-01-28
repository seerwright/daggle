import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CompetitionFile } from '../models/competition-file.model';

@Injectable({
  providedIn: 'root',
})
export class CompetitionFileService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  list(slug: string): Observable<CompetitionFile[]> {
    return this.http.get<CompetitionFile[]>(
      `${this.baseUrl}/competitions/${slug}/files`
    );
  }

  upload(
    slug: string,
    file: File,
    displayName?: string,
    purpose?: string
  ): Observable<CompetitionFile> {
    const formData = new FormData();
    formData.append('file', file);
    if (displayName) {
      formData.append('display_name', displayName);
    }
    if (purpose) {
      formData.append('purpose', purpose);
    }
    return this.http.post<CompetitionFile>(
      `${this.baseUrl}/competitions/${slug}/files`,
      formData
    );
  }

  update(
    slug: string,
    fileId: number,
    data: { display_name?: string; purpose?: string }
  ): Observable<CompetitionFile> {
    return this.http.patch<CompetitionFile>(
      `${this.baseUrl}/competitions/${slug}/files/${fileId}`,
      data
    );
  }

  delete(slug: string, fileId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/competitions/${slug}/files/${fileId}`
    );
  }

  getDownloadUrl(slug: string, fileId: number): string {
    return `${this.baseUrl}/competitions/${slug}/files/${fileId}`;
  }

  getDownloadAllUrl(slug: string): string {
    return `${this.baseUrl}/competitions/${slug}/files/download-all`;
  }
}
