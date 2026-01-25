import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Author {
  id: number;
  username: string;
  display_name: string;
}

export interface Reply {
  id: number;
  thread_id: number;
  content: string;
  author: Author;
  created_at: string;
}

export interface Thread {
  id: number;
  competition_id?: number;
  title: string;
  content: string;
  author: Author;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count?: number;
  replies?: Reply[];
  created_at: string;
  updated_at: string;
}

export interface ThreadsResponse {
  threads: Thread[];
  total: number;
  skip: number;
  limit: number;
}

export interface CreateThreadRequest {
  title: string;
  content: string;
}

export interface CreateReplyRequest {
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class DiscussionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getThreads(
    slug: string,
    skip: number = 0,
    limit: number = 20
  ): Observable<ThreadsResponse> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());
    return this.http.get<ThreadsResponse>(
      `${this.apiUrl}/competitions/${slug}/discussions`,
      { params }
    );
  }

  getThread(slug: string, threadId: number): Observable<Thread> {
    return this.http.get<Thread>(
      `${this.apiUrl}/competitions/${slug}/discussions/${threadId}`
    );
  }

  createThread(slug: string, data: CreateThreadRequest): Observable<Thread> {
    return this.http.post<Thread>(
      `${this.apiUrl}/competitions/${slug}/discussions`,
      data
    );
  }

  createReply(
    slug: string,
    threadId: number,
    data: CreateReplyRequest
  ): Observable<Reply> {
    return this.http.post<Reply>(
      `${this.apiUrl}/competitions/${slug}/discussions/${threadId}/replies`,
      data
    );
  }
}
