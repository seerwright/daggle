export type NotificationType =
  | 'submission_scored'
  | 'submission_failed'
  | 'competition_started'
  | 'competition_ending'
  | 'discussion_reply'
  | 'team_invitation'
  | 'team_member_joined'
  | 'team_removed'
  | 'team_leadership'
  | 'system';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unread_count: number;
  total: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkReadResponse {
  message: string;
}
