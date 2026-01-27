import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FAQ, FAQCreate, FAQUpdate } from '../models/faq.model';

@Injectable({
  providedIn: 'root',
})
export class FAQService {
  constructor(private api: ApiService) {}

  list(slug: string): Observable<FAQ[]> {
    return this.api.get<FAQ[]>(`/competitions/${slug}/faqs`);
  }

  create(slug: string, data: FAQCreate): Observable<FAQ> {
    return this.api.post<FAQ>(`/competitions/${slug}/faqs`, data);
  }

  update(slug: string, faqId: number, data: FAQUpdate): Observable<FAQ> {
    return this.api.patch<FAQ>(`/competitions/${slug}/faqs/${faqId}`, data);
  }

  delete(slug: string, faqId: number): Observable<void> {
    return this.api.delete<void>(`/competitions/${slug}/faqs/${faqId}`);
  }

  reorder(slug: string, faqIds: number[]): Observable<FAQ[]> {
    return this.api.post<FAQ[]>(`/competitions/${slug}/faqs/reorder`, { faq_ids: faqIds });
  }
}
