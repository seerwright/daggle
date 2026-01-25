import { Notification } from './notification.model';

export interface DashboardCompetition {
  id: number;
  title: string;
  slug: string;
  status: string;
  enrolled_at: string;
  days_remaining: number | null;
  user_rank: number | null;
  total_participants: number;
  best_score: number | null;
  submission_count: number;
}

export interface DashboardSubmission {
  id: number;
  competition_id: number;
  competition_title: string;
  competition_slug: string;
  score: number | null;
  status: string;
  created_at: string;
}

export interface DashboardStats {
  total_competitions: number;
  active_competitions: number;
  total_submissions: number;
  unread_notifications: number;
}

export interface DashboardResponse {
  competitions: DashboardCompetition[];
  recent_submissions: DashboardSubmission[];
  recent_notifications: Notification[];
  stats: DashboardStats;
}

export interface DashboardStatsResponse {
  stats: DashboardStats;
}
