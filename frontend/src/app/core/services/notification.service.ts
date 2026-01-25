import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  NotificationListResponse,
  UnreadCountResponse,
  MarkReadResponse,
} from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getNotifications(
    skip = 0,
    limit = 20,
    unreadOnly = false
  ): Observable<NotificationListResponse> {
    const params: Record<string, string> = {
      skip: skip.toString(),
      limit: limit.toString(),
    };
    if (unreadOnly) {
      params['unread_only'] = 'true';
    }
    return this.http.get<NotificationListResponse>(
      `${this.baseUrl}/notifications`,
      { params }
    );
  }

  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(
      `${this.baseUrl}/notifications/unread-count`
    );
  }

  markAsRead(notificationId: number): Observable<MarkReadResponse> {
    return this.http.post<MarkReadResponse>(
      `${this.baseUrl}/notifications/${notificationId}/read`,
      {}
    );
  }

  markAllAsRead(): Observable<MarkReadResponse> {
    return this.http.post<MarkReadResponse>(
      `${this.baseUrl}/notifications/read-all`,
      {}
    );
  }
}
