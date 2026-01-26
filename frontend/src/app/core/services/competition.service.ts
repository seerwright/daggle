import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Competition, CompetitionListItem } from '../models/competition.model';

@Injectable({
  providedIn: 'root',
})
export class CompetitionService {
  constructor(private api: ApiService) {}

  list(skip = 0, limit = 20): Observable<CompetitionListItem[]> {
    return this.api.get<CompetitionListItem[]>(
      `/competitions/?skip=${skip}&limit=${limit}`
    );
  }

  getBySlug(slug: string): Observable<Competition> {
    return this.api.get<Competition>(`/competitions/${slug}`);
  }

  create(data: Partial<Competition>): Observable<Competition> {
    return this.api.post<Competition>('/competitions/', data);
  }

  update(slug: string, data: Partial<Competition>): Observable<Competition> {
    return this.api.patch<Competition>(`/competitions/${slug}`, data);
  }

  delete(slug: string): Observable<void> {
    return this.api.delete<void>(`/competitions/${slug}`);
  }

  uploadTruthSet(slug: string, file: File): Observable<Competition> {
    return this.api.upload<Competition>(`/competitions/${slug}/truth-set`, file);
  }
}
